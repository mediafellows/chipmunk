export default (...args) => {
  args.unshift("chipmunk:log");
  console.warn.apply(null, args);
};
