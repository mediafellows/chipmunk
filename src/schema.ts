import {
  each,
  isEmpty,
  isObject,
  split,
  trim,
  first,
  reduce,
  merge,
} from "lodash";

const detectProps = (structure: string) => {
  let result = {};
  let edges = [0];
  let delimiter = /({|}|,)/g;
  let count = 0; // count of current bracket deepness
  var match;

  while ((match = delimiter.exec(structure)) != null) {
    let character = first(match);

    if (character == "{") count++;
    else if (character == "}") count--;
    else if (character == "," && count == 0) {
      edges.push(match.index - 1); // previous end
      edges.push(match.index + 1); // next start
    }
  }
  if (count != 0) throw new Error("bad structure"); // '{' vs '}' mismatch!

  edges.push(structure.length - 1);

  while (edges.length > 0) {
    let curly;
    let start = edges.shift();
    let end = edges.shift();
    let length = end - start;
    let prop = trim(structure.substr(start, length + 1));
    if (isEmpty(prop)) continue;

    if ((curly = prop.indexOf("{")) >= 0) {
      let rest = prop.length - curly - 2;
      let name = trim(prop.substr(0, curly));
      let inner = prop.substr(curly + 1, rest);

      result[name] = detectProps(inner);
    } else {
      result[prop] = true;
    }
  }

  return result;
};

export default (structure) => {
  if (isObject(structure)) return structure;

  structure = (structure || "").replace(/\n|\r/g, ""); // removes newlines
  return detectProps(structure);
};
