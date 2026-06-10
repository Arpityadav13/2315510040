type Stack = "backend" | "frontend";
type Level = "debug" | "info" | "warn" | "error" | "fatal";
type BackendPackage = "cache" | "controller" | "cron_job" | "db" | "domain" | "handler" | "repository" | "route" | "service";
type FrontendPackage = "api" | "component" | "hook" | "page" | "state" | "style";
type BothPackage = "auth" | "config" | "middleware" | "util";
type Package = BackendPackage | FrontendPackage | BothPackage;
export declare function log(stack: Stack, level: Level, pkg: Package, message: string): Promise<void>;
export {};
