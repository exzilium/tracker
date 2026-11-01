declare module 'react-test-renderer' {
  import { ReactElement } from 'react';

  export interface ReactTestInstance {
    instance: any;
    type: any;
    props: { [propName: string]: any };
    parent: ReactTestInstance | null;
    children: Array<ReactTestInstance | string>;
    findByType(type: any): ReactTestInstance;
    findAllByType(type: any, options?: { deep?: boolean }): ReactTestInstance[];
    findByProps(props: { [propName: string]: any }): ReactTestInstance;
    findAllByProps(props: { [propName: string]: any }, options?: { deep?: boolean }): ReactTestInstance[];
  }

  export interface ReactTestRenderer {
    root: ReactTestInstance;
    toJSON(): any;
    unmount(nextElement?: ReactElement): void;
    update(nextElement: ReactElement): void;
  }

  export function create(nextElement: ReactElement, options?: any): ReactTestRenderer;
  export function act(callback: () => void | Promise<void>): any;

  const renderer: {
    create: typeof create;
    act: typeof act;
  };

  export default renderer;
}

