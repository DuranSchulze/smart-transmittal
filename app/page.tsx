// import { ComponentExample } from "@/components/component-example";
import { App } from "@/components/main/App";
import { AppProviders } from "@/components/main/AppProviders";

export default function Page() {
    return (
        <AppProviders>
            <App />
        </AppProviders>
    );
}
