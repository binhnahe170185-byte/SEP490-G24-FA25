export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const profile = JSON.parse(localStorage.getItem("profile") || "null");
    if (token && profile) {
      setAuthToken(token);
      setUser({ ...profile, token });
    }
  }, []);

  const login = ({ token, profile }) => {
    setAuthToken(token);
    setUser({ ...profile, token });
    localStorage.setItem("token", token);
    localStorage.setItem("profile", JSON.stringify(profile));
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("profile");
  };

  return <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>;
}