export default function Avatar({ user, size = 36 }) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  const initials = name
    ? name.split(/\s+/).slice(0, 2).map(s => s[0].toUpperCase()).join("")
    : (user?.username?.[0] || "?").toUpperCase();

  const url = user?.avatarUrl; // add this field later if/when you store profile photos

  if (url) {
    return (
      <img
        src={url}
        alt={name || "User"}
        style={{ width: size, height: size }}
        className="rounded-full object-cover ring-1 ring-black/5"
      />
    );
  }

  return (
    <div
      title={name || user?.email}
      style={{ width: size, height: size }}
      className="rounded-full grid place-items-center font-semibold text-white select-none"
    >
      <div
        className="w-full h-full rounded-full grid place-items-center"
        style={{ background: "#4b0082" /* brand purple */ }}
      >
        {initials}
      </div>
    </div>
  );
}
