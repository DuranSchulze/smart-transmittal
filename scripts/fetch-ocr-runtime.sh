#!/bin/sh
# Provision the local OCR runtime for @firecrawl/pdf-inspector (workflow Step 9).
#
# Downloads checksum-pinned PDFium and ONNX Runtime shared libraries and warms the
# pinned PP-OCRv6 model set into vendor/ocr/, which next.config.mjs bundles with the
# parse and QA routes. Requests then run with `offline: true` and never download.
#
#   OCR_BUNDLE_RUNTIME=true sh scripts/fetch-ocr-runtime.sh   # provision
#   sh scripts/fetch-ocr-runtime.sh                          # no-op unless enabled
#
# Supported: linux-x64 (Vercel, tested upstream) and mac-arm64 (local, "preview" upstream).
# Override the platform with OCR_RUNTIME_PLATFORM=linux-x64 when cross-provisioning.
set -eu

if [ "${OCR_BUNDLE_RUNTIME:-}" != "true" ]; then
  echo "fetch-ocr-runtime: OCR_BUNDLE_RUNTIME is not 'true'; skipping (OCR stays unavailable)."
  exit 0
fi

ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT="$ROOT/vendor/ocr"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

detect() {
  case "$(uname -s)-$(uname -m)" in
    Linux-x86_64) echo linux-x64 ;;
    Darwin-arm64) echo mac-arm64 ;;
    *) echo unsupported ;;
  esac
}
PLATFORM=${OCR_RUNTIME_PLATFORM:-$(detect)}

PDFIUM_BASE="https://github.com/firecrawl/pdfium-rs/releases/download/native-v7988"
case "$PLATFORM" in
  linux-x64)
    PDFIUM_ASSET="firecrawl-pdfium-linux-x64.tgz"
    PDFIUM_SHA="6248189e07bbc33cdeb31976c539a88614307c8a19f3276dbd018efbe5b4a2a2"
    PDFIUM_LIB="lib/libpdfium.so"
    ORT_URL="https://files.pythonhosted.org/packages/26/81/24dd9b31b0fb912ee19ca53ac1c9764bfd79d58a2ccef564eb693be831a5/onnxruntime-1.27.0-cp312-cp312-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl"
    ORT_SHA="7c65a7438632d55dfbc8a02ee60bd6cf7dd9d1ba05a43d4b851452f32338e194"
    ORT_LIB="libonnxruntime.so.1.27.0"
    ;;
  mac-arm64)
    PDFIUM_ASSET="firecrawl-pdfium-mac-arm64.tgz"
    PDFIUM_SHA="4168356c2e62ad5e79553e2e9162f5c99949759d90cb83876a50311f0c32b9b3"
    PDFIUM_LIB="lib/libpdfium.dylib"
    ORT_URL="https://files.pythonhosted.org/packages/c3/b7/dd3a524ed93a820dff1af902d0412957ab12499953333e9daa01af5bc480/onnxruntime-1.27.0-cp312-cp312-macosx_14_0_arm64.whl"
    ORT_SHA="a14c2ce45312def86b77aea651f46565e45960cf5f0721bfdff449165086ab76"
    ORT_LIB="libonnxruntime.1.27.0.dylib"
    ;;
  *)
    echo "fetch-ocr-runtime: unsupported platform $(uname -s)-$(uname -m); OCR stays unavailable." >&2
    exit 0
    ;;
esac

sha256() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1
  else shasum -a 256 "$1" | cut -d' ' -f1; fi
}
verify() {
  actual=$(sha256 "$1")
  if [ "$actual" != "$2" ]; then
    echo "fetch-ocr-runtime: checksum mismatch for $(basename "$1") (got $actual)" >&2
    exit 1
  fi
}

rm -rf "$OUT/cache" && mkdir -p "$OUT/lib" "$OUT/cache"

echo "fetch-ocr-runtime: PDFium native-v7988 ($PLATFORM)"
curl -fsSL --retry 3 -o "$TMP/pdfium.tgz" "$PDFIUM_BASE/$PDFIUM_ASSET"
verify "$TMP/pdfium.tgz" "$PDFIUM_SHA"
tar xzf "$TMP/pdfium.tgz" -C "$TMP" "$PDFIUM_LIB"
cp "$TMP/$PDFIUM_LIB" "$OUT/lib/"

echo "fetch-ocr-runtime: ONNX Runtime 1.27.0 ($PLATFORM)"
curl -fsSL --retry 3 -o "$TMP/ort.whl" "$ORT_URL"
verify "$TMP/ort.whl" "$ORT_SHA"
# Same selection as the upstream guide: the runtime plus its shared provider stub.
unzip -q -j -o "$TMP/ort.whl" 'onnxruntime/capi/libonnxruntime*' -d "$OUT/lib"
[ -f "$OUT/lib/$ORT_LIB" ] || { echo "fetch-ocr-runtime: $ORT_LIB missing from the wheel" >&2; exit 1; }

echo "fetch-ocr-runtime: warming the pinned OCR model set"
PDFIUM_LIB_PATH="$OUT/lib/$(basename "$PDFIUM_LIB")" \
ORT_DYLIB_PATH="$OUT/lib/$ORT_LIB" \
PDF_INSPECTOR_MODEL_CACHE="$OUT/cache" \
  node "$ROOT/scripts/ocr-warmup.mjs"

# Bundle only the three model files as a read-only modelDirectory; the managed
# cache also writes .lock files, which a read-only deployment cannot create.
MODEL_SRC="$OUT/cache/pp-ocrv6-small/oar-ocr-v0.7.0"
rm -rf "$OUT/models" && mkdir -p "$OUT/models"
for file in pp-ocrv6_small_det.onnx pp-ocrv6_small_rec.onnx ppocrv6_dict.txt; do
  [ -f "$MODEL_SRC/$file" ] || { echo "fetch-ocr-runtime: model file $file missing after warm-up" >&2; exit 1; }
  cp "$MODEL_SRC/$file" "$OUT/models/"
done
rm -rf "$OUT/cache"

{
  echo "platform=$PLATFORM"
  echo "pdfium=native-v7988 sha256=$PDFIUM_SHA"
  echo "onnxruntime=1.27.0 sha256=$ORT_SHA"
  echo "models (PP-OCRv6 Small, oar-ocr-v0.7.0):"
  (cd "$OUT/models" && find . -type f -exec sh -c 'printf "  %s %s %s\n" "$(wc -c < "$1" | tr -d " ")" "$1" "$(shasum -a 256 "$1" 2>/dev/null | cut -d" " -f1 || sha256sum "$1" | cut -d" " -f1)"' _ {} \;)
} > "$OUT/MANIFEST.txt"
du -sh "$OUT" | sed 's/^/fetch-ocr-runtime: bundle size /'
echo "fetch-ocr-runtime: done. Set OCR_ENABLED=true to use it."
