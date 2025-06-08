// Type declarations for external modules without TypeScript support

declare module "@binance/connector" {
  export class WebsocketStream {
    constructor(options: {
      logger: any;
      callbacks: {
        open?: () => void;
        close?: () => void;
        message?: (data: string) => void;
      };
    });
    ticker(): void;
    kline(symbol: string, interval: string): void;
  }
}

declare module "swagger-ui-express" {
  import { RequestHandler } from "express";

  interface SwaggerUiOptions {
    customSiteTitle?: string;
    customCss?: string;
    customCssUrl?: string;
  }

  export function serve(req: any, res: any, next: any): void;
  export function setup(
    swaggerDoc: any,
    options?: SwaggerUiOptions
  ): RequestHandler;
}
