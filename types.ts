
export interface TransmittalItem {
  id: string;
  qty: string;
  noOfItems: string;
  documentNumber: string;
  description: string;
  remarks: string;
  fileType?: 'upload' | 'gdrive' | 'link';
  fileSource?: string; // URL or File Name
}

export interface RecipientInfo {
  to: string;
  email: string;
  company: string;
  attention: string;
  address: string;
  contactNumber: string;
}

export interface ProjectInfo {
  projectName: string;
  projectNumber: string;
  engagementRef: string;
  purpose: string;
  transmittalNumber: string;
  department: string;
  date: string;
  timeGenerated: string;
}

export interface SenderInfo {
  agencyName: string;
  addressLine1: string;
  addressLine2: string;
  website: string;
  mobile: string;
  telephone: string;
  email: string;
  logoBase64: string | null;
}

export interface Signatories {
  preparedBy: string;
  preparedByRole: string;
  notedBy: string;
  notedByRole: string;
  timeReleased: string;
}

export interface ReceivedBy {
  name: string;
  date: string;
  time: string;
  remarks: string;
}

export interface FooterNotes {
  acknowledgement: string;
  disclaimer: string;
}

export interface AppData {
  recipient: RecipientInfo;
  project: ProjectInfo;
  items: TransmittalItem[];
  sender: SenderInfo;
  signatories: Signatories;
  receivedBy: ReceivedBy;
  footerNotes: FooterNotes;
  notes: string;
  agencyId?: string | null;
  transmissionMethod: {
    personalDelivery: boolean;
    pickUp: boolean;
    grabLalamove: boolean;
    registeredMail: boolean;
  };
}

export type WorkspaceSection =
  | "files"
  | "sender"
  | "project"
  | "recipient"
  | "delivery"
  | "signoff"
  | "review";

export type WorkspaceProgress = Record<WorkspaceSection, boolean>;

export type DraftAction =
  | {
      type: "SET_DATA";
      data: AppData | ((previous: AppData) => AppData);
    }
  | {
      type: "UPDATE_FIELD";
      section: keyof AppData;
      field: string;
      value: unknown;
    }
  | { type: "ADD_ITEMS"; items: TransmittalItem[] }
  | {
      type: "UPDATE_ITEM";
      index: number;
      field: keyof TransmittalItem;
      value: string;
    }
  | { type: "REMOVE_ITEM"; index: number }
  | { type: "MOVE_ITEM"; index: number; direction: "up" | "down" }
  | { type: "REORDER_ITEMS"; fromIndex: number; toIndex: number }
  | { type: "ADJUST_QTY"; index: number; delta: number }
  | {
      type: "UPDATE_TRANSMISSION";
      method: keyof AppData["transmissionMethod"];
      checked: boolean;
    }
  | { type: "RESET" };
