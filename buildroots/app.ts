import { create } from "nano-css";

const nano = create();

nano.put("*,*::after,*::before", {
  boxSizing: "border-box",
  fontSize: "inherit",
  fontFamily: "inherit",
  color: "inherit",
  margin: 0,
  padding: 0,
  border: "0 solid",
});

nano.put("body", {
  backgroundImage: "url(./logo.png)",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  backgroundSize: "contain",
  height: "100vh",
  padding: "20px",
});
