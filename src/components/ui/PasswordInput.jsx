import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Password field with show/hide (eye) toggle. */
export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder,
  autoComplete,
  className = "",
  inputClassName = "",
  disabled,
  style,
  onKeyDown,
}) {
  const [show, setShow] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        style={style}
        className={`${inputClassName} pr-10`}
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        aria-label={show ? "Hide password" : "Show password"}
        onClick={() => setShow((v) => !v)}
      >
        {show ? <EyeOff className="h-5 w-5" strokeWidth={2} /> : <Eye className="h-5 w-5" strokeWidth={2} />}
      </button>
    </div>
  );
}
