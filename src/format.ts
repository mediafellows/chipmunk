import reduce from "lodash/reduce";
import assign from "lodash/assign";
import filter from "lodash/filter";
import each from "lodash/each";
import first from "lodash/first";
import map from "lodash/map";
import reject from "lodash/reject";
import isEmpty from "lodash/isEmpty";
import isFunction from "lodash/isFunction";
import isPlainObject from "lodash/isPlainObject";
import isArray from "lodash/isArray";
import isString from "lodash/isString";

export default (subject: any, multi: boolean, ROR: boolean): any => {
  if (isArray(subject)) {
    let objects = subject;

    objects = map(objects, (member) => {
      return ROR ? toROR(cleanup(member)) : cleanup(member);
    });

    if (!multi) {
      return objects;
    } else {
      // multi is for old metamodel controllers only
      return reduce(
        objects,
        (acc, member) => assign(acc, { [member.id]: member }),
        {}
      );
    }
  } else {
    let object = subject;
    object = ROR ? toROR(cleanup(object)) : cleanup(object);

    return object;
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

export const extractFilename = (headers) => {
  const contentDisposition = headers['content-disposition'];
  if (contentDisposition) {
    const matches = contentDisposition.match(/filename="?([^"]+)"?/);
    return matches ? matches[1] : 'download';
  }
  return 'download';
};