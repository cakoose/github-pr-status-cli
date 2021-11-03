export function impossible(_value: never): never {
    throw new Error('impossible! (according to static types)');
}
