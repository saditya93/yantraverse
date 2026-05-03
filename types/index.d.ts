// TypeScript declarations for yantraverse

export interface Request {
  method: string;
  url: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body?: any;
  headers: Record<string, string>;
}

export interface Response {
  json(data: any, status?: number): void;
  html(html: string, status?: number): void;
  redirect(url: string): void;
  writeHead(status: number, headers?: Record<string, string>): void;
  end(data?: any): void;
  setHeader(key: string, value: string): void;
}

export interface Handler {
  (req: Request, res: Response, next?: () => void): void;
}

export interface App {
  use(middleware: Handler): App;
  get(pattern: string, handler: Handler): App;
  post(pattern: string, handler: Handler): App;
  put(pattern: string, handler: Handler): App;
  delete(pattern: string, handler: Handler): App;
  group(prefix: string, fn: (app: App) => void): App;
  static(dir: string, prefix: string): App;
  notFound(handler: Handler): App;
  onError(handler: (err: Error, req: Request, res: Response) => void): App;
  listen(port: number, callback?: (port: number) => void): any;
}

export default function yantraverse(): App;
