import { initials } from "../data.js";

// Shows the profile picture if there is one, otherwise the person's initials.
export default function Avatar({ name, photo, size = "lg", as: Tag = "span", ...rest }) {
  return (
    <Tag className={"avatar " + size} {...rest}>
      {photo ? <img src={photo} alt="" /> : initials(name)}
    </Tag>
  );
}
