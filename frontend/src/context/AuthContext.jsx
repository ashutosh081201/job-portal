import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

// A bad value in localStorage (edited by hand, or from an old version) must not
// take the whole app down; treat it as logged out.
const readStoredUser = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    return user && typeof user === "object" ? user : null;
  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  // localStorage is read synchronously above, so there is nothing to wait for;
  // kept in the context because ProtectedRoute reads it
  const loading = false;

  const login = (userData, userToken) => {
    setUser(userData);
    localStorage.setItem("token", userToken);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
