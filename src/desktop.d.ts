export {};
declare global {
  interface Window {
    perryParrotDesktop?: {
      isDesktop: boolean;
      listSources: () => Promise<Array<{id:string;name:string;type:string;thumbnail:string;appIcon:string}>>;
      ollamaTags: (base:string) => Promise<{ok:boolean;status:number;data:any}>;
      ollamaChat: (base:string, body:unknown) => Promise<{ok:boolean;status:number;data:any}>;
      updateAnswer: (payload:{question:string;answer:string}) => Promise<boolean>;
      showAnswerWindow: () => Promise<boolean>;
      hideAnswerWindow: () => Promise<boolean>;
      closeAnswerWindow: () => Promise<boolean>;
      onAnswerUpdate: (callback:(payload:{question:string;answer:string;updatedAt:string})=>void) => () => void;
    };
  }
}
