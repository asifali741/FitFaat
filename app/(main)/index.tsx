import { Redirect } from "expo-router";

export default function MainIndex() {
  console.log("landed on /(main)/index - redirecting to dashboard");
  return <Redirect href="/(main)/(dashboard)" />;
}
