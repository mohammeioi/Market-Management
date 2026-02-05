import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { LogIn, UserPlus, Eye, EyeOff } from "lucide-react";

interface AuthPageProps {
  onAuth: (user: User) => void;
}

export function AuthPage({ onAuth }: AuthPageProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: ""
  });

  useEffect(() => {
    // تحقق من وجود مستخدم مسجل بالفعل
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        onAuth(session.user);
      }
    };
    checkUser();
  }, [onAuth]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: formData.fullName
          }
        }
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast({
            title: "المستخدم موجود بالفعل",
            description: "هذا البريد الإلكتروني مسجل مسبقاً. جرب تسجيل الدخول بدلاً من ذلك.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "خطأ في التسجيل",
            description: error.message,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "تم إنشاء الحساب",
          description: "تحقق من بريدك الإلكتروني لتفعيل الحساب"
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "بيانات خاطئة",
            description: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
            variant: "destructive"
          });
        } else {
          toast({
            title: "خطأ في تسجيل الدخول",
            description: error.message,
            variant: "destructive"
          });
        }
      } else if (data.user) {
        toast({
          title: "مرحباً بك",
          description: "تم تسجيل الدخول بنجاح"
        });
        onAuth(data.user);
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            نظام نقاط البيع
          </CardTitle>
          <p className="text-muted-foreground">
            سجل الدخول للوصول إلى النظام
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">تسجيل الدخول</TabsTrigger>
              <TabsTrigger value="signup">إنشاء حساب</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="text-right"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      placeholder="••••••••"
                      required
                      className="text-right pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-auto p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </div>
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "جاري تسجيل الدخول..." : (
                    <>
                      <LogIn size={16} className="ml-2" />
                      تسجيل الدخول
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">الاسم الكامل</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    placeholder="أدخل اسمك الكامل"
                    required
                    className="text-right"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email-signup">البريد الإلكتروني</Label>
                  <Input
                    id="email-signup"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="text-right"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password-signup">كلمة المرور</Label>
                  <div className="relative">
                    <Input
                      id="password-signup"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      placeholder="••••••••"
                      required
                      className="text-right pr-10"
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-auto p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    يجب أن تكون كلمة المرور 6 أحرف على الأقل
                  </p>
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "جاري إنشاء الحساب..." : (
                    <>
                      <UserPlus size={16} className="ml-2" />
                      إنشاء حساب
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}