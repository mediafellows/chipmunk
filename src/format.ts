import {
  keys,
  reduce,
  assign,
  filter,
  get,
  each,
  merge,
  first,
  map,
  reject,
  isEmpty,
  isFunction,
  isPlainObject,
  isArray,
  isString,
} from "lodash";

export default (objects: any, multi: boolean, ROR: boolean): any => {
  if (!isArray(objects)) objects = [objects];

  objects = map(objects, (member) => {
    return ROR ? toROR(cleanup(member)) : cleanup(member);
  });

  if (!multi) {
    return first(objects);
  } else {
    return reduce(
      objects,
      (acc, member) => assign(acc, { [member.id]: member }),
      {}
    );
  }
};

// cleans the object to be send
// * rejects js functions
// * rejects empty objects {}
// * rejects empty objects within array [{}]
const cleanup = (object) => {
  if (isEmpty(object)) return {};

  const cleaned = {};
  each(object, (value, key) => {
    if (/^\@/.test(key) || key === "errors" || isFunction(value)) {
      // skip
    } else if (isArray(value)) {
      if (isPlainObject(value[0])) {
        const subset = map(value, (x) => cleanup(x));
        cleaned[key] = reject(subset, (x) => isEmpty(x));
      } else {
        cleaned[key] = value;
      }
    } else if (isPlainObject(value)) {
      const cleanedValue = cleanup(value);
      if (!isEmpty(cleanedValue)) cleaned[key] = cleanedValue;
    } else {
      cleaned[key] = value;
    }
  });

  return cleaned;
};

const toROR = (object) => {
  each(object, (value, key) => {
    // split csv string to array
    if (isString(value) && /_ids$/.test(key)) {
      var values = filter(value.split(","), (item) => {
        return !isEmpty(item);
      });
      object[key] = values;
    }
    // append '_attributes' to nested objects (attributes that are an object or are an array of objects)
    else if (
      isPlainObject(value) ||
      (isArray(value) && isPlainObject(first(value)))
    ) {
      object[`${key}_attributes`] = value;
      delete object[key];
    }
  });

  return object;
};
