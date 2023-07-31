import tracer from "dd-trace";

tracer.init({
  logInjection: true,
  profiling: true,
});

export default tracer;
