import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthUI } from "@/components/ui/AuthUI";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  const mode = window.location.pathname === "/register" ? "signup" : "signin";

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, isLoading, navigate]);

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-surface">
      <AuthUI defaultMode={mode} />
    </div>
  );
}
