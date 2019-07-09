import { Web } from "../Namespaces/Helper";
import { DownloadStatus } from "../Content/ContentInterfaces";
import { Manager } from "../Content/ContentManager";

/** Callback giving the caller access to download statistics. */
export type StatusCallback = (status: DownloadStatus) => void;

/** Callback for an either successful or failed resource download. */
export type DownloadCallback = (uri: string, response: Web.HttpResponse) => void;

/** Callback for a successful content load. */
export type LoadCallback = (content: Manager) => void;

export * from "../Content/ContentInterfaces";
export * from "../Content/ContentFunctions";
export * from "../Content/ContentType";
export * from "../Content/ContentManager";
export * from "../Content/ContentList";