type AuthButtonProps = {
  provider: "Google" | "Kakao" | "Naver";
  disabled?: boolean;
};

export default function AuthButton({
  provider,
  disabled = false,
}: AuthButtonProps) {
  return (
    <button
      className={`auth-button auth-button--${provider.toLowerCase()}`}
      type="button"
      disabled={disabled}
    >
      <span className="auth-button__provider">{provider}</span>
      <span className="auth-button__label">
        {disabled ? "Login coming soon" : "Continue"}
      </span>
    </button>
  );
}
