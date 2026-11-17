import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import Avatar from "../components/Avatar.jsx";
import { useToast } from "../components/Toast.jsx";
import { useAuth } from "../auth.jsx";
import PasswordDialog from "../components/PasswordDialog.jsx";
import { readImage } from "../image.js";

export default function Profile() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user, logout, setPhoto } = useAuth();
  const fileInput = useRef();
  const [changingPassword, setChangingPassword] = useState(false);

  async function pickPhoto(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      await setPhoto(await readImage(file));
      toast("Profile picture updated");
    } catch (err) {
      toast(err.message, "error");
    }
  }

  async function removePhoto() {
    try {
      await setPhoto("");
      toast("Profile picture removed");
    } catch (err) {
      toast(err.message, "error");
    }
  }

  async function signOut() {
    await logout();
    navigate("/login");
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Your profile</h1>
          <p className="lead">Your account information</p>
        </div>
      </div>

      <section className="card">
        <div className="profile-top">
          <div className="profile-id">
            <Avatar name={user.name} photo={user.photo} size="xl" />
            <div><h3>{user.name}</h3><p>{user.role}, Quezon City University</p></div>
          </div>
          <div className="actions">
            {user.photo && <button className="btn" onClick={removePhoto}>Remove photo</button>}
            <button className="btn" onClick={() => fileInput.current.click()}><Icon name="pencil" />{user.photo ? "Change photo" : "Upload photo"}</button>
            <input type="file" ref={fileInput} accept="image/*" hidden onChange={pickPhoto} />
          </div>
        </div>
        <dl className="info-grid">
          <div><dt>Full name</dt><dd>{user.name}</dd></div>
          <div><dt>University email</dt><dd>{user.email}</dd></div>
          <div><dt>Position</dt><dd>{user.role}</dd></div>
          <div><dt>Department</dt><dd>Registrar's Office</dd></div>        </dl>
      </section>

      <section className="card">
        <div className="card-head"><h2>Security</h2></div>
        <div className="security-row">
          <div><strong>Password</strong><small>Change it regularly to keep your account safe.</small></div>
          <button className="btn" onClick={() => setChangingPassword(true)}><Icon name="lock" />Change password</button>
        </div>
        <div className="security-row">
          <div><strong>Sign out</strong><small>You will need to sign in again to continue.</small></div>
          <button className="btn danger" onClick={signOut}><Icon name="logout" />Log out</button>
        </div>
      </section>

      <PasswordDialog open={changingPassword} onClose={() => setChangingPassword(false)} />
    </>
  );
}
