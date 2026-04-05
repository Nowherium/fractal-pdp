export type StateController<T> = {
  get: () => T;
  set: (update: T | ((previous: T) => T)) => void;
};

export const createState = <T>(initialValue: T): StateController<T> => {
  let currentValue = initialValue;

  return {
    get: () => currentValue,
    set: (update) => {
      currentValue =
        typeof update === "function"
          ? (update as (previous: T) => T)(currentValue)
          : update;
    },
  };
};

export const withAlertStub = (callback: (alerts: string[]) => void) => {
  const alerts: string[] = [];
  const previousWindow = globalThis.window;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      ...(previousWindow ?? {}),
      alert: (message: unknown) => alerts.push(String(message ?? "")),
    },
    writable: true,
  });

  try {
    callback(alerts);
  } finally {
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: previousWindow,
        writable: true,
      });
    }
  }
};

export const withWindowStub = ({
  confirmResult = true,
  callback,
}: {
  confirmResult?: boolean;
  callback: (alerts: string[]) => void;
}) => {
  const alerts: string[] = [];
  const previousWindow = globalThis.window;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      ...(previousWindow ?? {}),
      alert: (message: unknown) => alerts.push(String(message ?? "")),
      confirm: () => confirmResult,
    },
    writable: true,
  });

  try {
    callback(alerts);
  } finally {
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: previousWindow,
        writable: true,
      });
    }
  }
};
