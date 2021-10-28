export default (...args) => {
  args.unshift("chowchow:log");
  console.warn.apply(null, args);
};
