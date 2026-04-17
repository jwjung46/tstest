import { buildSignOutPath } from "../model/auth.ts";

export default function SignOutForm() {
  return (
    <form action={buildSignOutPath()} method="post">
      <button className="sign-out-button" type="submit">
        Sign out
      </button>
    </form>
  );
}
