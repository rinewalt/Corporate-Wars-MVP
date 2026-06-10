export function isGender(value) {
    return value === "male" || value === "female";
}
export function readName(value) {
    if (typeof value !== "string")
        throw new Error("Name is required.");
    const name = value.trim();
    if (name.length < 1 || name.length > 16)
        throw new Error("Name must be 1-16 characters.");
    return name;
}
export function readRoomCode(value) {
    if (typeof value !== "string")
        throw new Error("Room code is required.");
    const code = value.trim().toUpperCase();
    if (!/^[A-Z2-9]{5}$/.test(code))
        throw new Error("Invalid room code.");
    return code;
}
export function readString(value, label) {
    if (typeof value !== "string" || value.length < 1)
        throw new Error(`${label} is required.`);
    return value;
}
