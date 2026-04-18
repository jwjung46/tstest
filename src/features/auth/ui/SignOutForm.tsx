import { buildSignOutPath } from "../model/auth.ts";

type SignOutFormProps = {
  className?: string;
};

export default function SignOutForm({ className }: SignOutFormProps) {
  return (
    <form action={buildSignOutPath()} className={className} method="post">
      <button className="sign-out-button" type="submit">
        Sign out
      </button>
    </form>
  );
}
