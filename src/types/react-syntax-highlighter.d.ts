declare module "react-syntax-highlighter" {
  import type { ComponentType, CSSProperties } from "react";
  export const Prism: ComponentType<{
    language: string;
    style: Record<string, CSSProperties>;
    customStyle?: CSSProperties;
    codeTagProps?: { style?: CSSProperties };
    showLineNumbers?: boolean;
    PreTag?: keyof JSX.IntrinsicElements;
    children?: string;
  }>;
}

declare module "react-syntax-highlighter/dist/esm/styles/prism" {
  import type { CSSProperties } from "react";
  export const oneDark: Record<string, CSSProperties>;
}
