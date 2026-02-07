function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function deepMerge(target, source) {
  const result = { ...(target || {}) };

  if (!isPlainObject(source)) {
    return result;
  }

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      result[key] = deepMerge(targetValue, sourceValue);
      continue;
    }

    if (isPlainObject(sourceValue)) {
      result[key] = deepMerge({}, sourceValue);
      continue;
    }

    if (Array.isArray(sourceValue)) {
      result[key] = sourceValue.slice();
      continue;
    }

    result[key] = sourceValue;
  }

  return result;
}

export function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze(value[key]);
    }
  }

  return value;
}
