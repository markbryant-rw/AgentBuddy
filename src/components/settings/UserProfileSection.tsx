import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "@/hooks/useProfile";
import { Loader2, Upload, User, Mail, Calendar, Phone, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

// Validation schemas
const mobileSchema = z.string()
  .trim()
  .refine((val) => !val || /^(\+64|0)?[2-9]\d{7,9}$/.test(val.replace(/[\s-]/g, '')), {
    message: "Invalid NZ mobile number format"
  });

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be less than 100 characters");

export const UserProfileSection = () => {
  const { profile, updateProfile, uploadAvatar } = useProfile();
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    email: profile?.email || "",
    mobile: profile?.mobile || "",
    birthday_day: "",
    birthday_month: "",
    birthday_year: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Parse birthday into day, month, year
  useEffect(() => {
    if (profile?.birthday) {
      const date = new Date(profile.birthday);
      setFormData(prev => ({
        ...prev,
        birthday_day: String(date.getDate()).padStart(2, '0'),
        birthday_month: String(date.getMonth() + 1).padStart(2, '0'),
        birthday_year: String(date.getFullYear()),
      }));
    }
  }, [profile?.birthday]);

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        full_name: profile.full_name || "",
        email: profile.email || "",
        mobile: profile.mobile || "",
      }));
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setIsUploading(true);
    try {
      await uploadAvatar(file);
      toast.success("Avatar updated successfully");
    } catch (error) {
      toast.error("Failed to upload avatar");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Validate mobile number if provided
      if (formData.mobile) {
        const mobileValidation = mobileSchema.safeParse(formData.mobile);
        if (!mobileValidation.success) {
          toast.error(mobileValidation.error.errors[0].message);
          setIsSaving(false);
          return;
        }
      }

      // Construct birthday if all parts are provided
      let birthday: string | null = null;
      if (formData.birthday_day && formData.birthday_month && formData.birthday_year) {
        const day = parseInt(formData.birthday_day);
        const month = parseInt(formData.birthday_month);
        const year = parseInt(formData.birthday_year);
        
        // Validate date
        const date = new Date(year, month - 1, day);
        if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
          toast.error("Invalid birthday date");
          setIsSaving(false);
          return;
        }
        
        birthday = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }

      // Normalize mobile number (remove spaces, add +64 prefix if needed)
      let normalizedMobile = formData.mobile.replace(/[\s-]/g, '');
      if (normalizedMobile && !normalizedMobile.startsWith('+')) {
        if (normalizedMobile.startsWith('0')) {
          normalizedMobile = '+64' + normalizedMobile.substring(1);
        } else if (!normalizedMobile.startsWith('64')) {
          normalizedMobile = '+64' + normalizedMobile;
        } else {
          normalizedMobile = '+' + normalizedMobile;
        }
      }

      await updateProfile({
        full_name: formData.full_name.trim(),
        mobile: normalizedMobile || null,
        birthday: birthday,
      });
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error("Failed to update profile: " + (error.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setIsChangingPassword(true);
    try {
      // Validate passwords
      if (!passwordData.newPassword || !passwordData.confirmPassword) {
        toast.error("Please fill in all password fields");
        setIsChangingPassword(false);
        return;
      }

      const passwordValidation = passwordSchema.safeParse(passwordData.newPassword);
      if (!passwordValidation.success) {
        toast.error(passwordValidation.error.errors[0].message);
        setIsChangingPassword(false);
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast.error("New passwords do not match");
        setIsChangingPassword(false);
        return;
      }

      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast.success("Password changed successfully");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      toast.error("Failed to change password: " + (error.message || "Unknown error"));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getInitials = () => {
    if (!profile?.full_name) return "?";
    return profile.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Personal Information
        </CardTitle>
        <CardDescription>
          Update your profile information and avatar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Upload */}
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || ""} />
            <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <Label htmlFor="avatar-upload" className="cursor-pointer">
              <Button variant="outline" size="sm" disabled={isUploading} asChild>
                <span>
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Change Avatar
                    </>
                  )}
                </span>
              </Button>
            </Label>
            <Input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              PNG, JPG up to 2MB. Recommended: 400x400px
            </p>
          </div>
        </div>

        {/* Profile Fields */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="full_name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Full Name
            </Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Mark Bryant"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Contact support to change your email address
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile_number" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Mobile Number
            </Label>
            <Input
              id="mobile"
              type="tel"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              placeholder="027 321 3749"
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">
              Format: 027 321 3749 or +64 27 321 3749
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Birthday
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={formData.birthday_day}
                onValueChange={(value) => setFormData({ ...formData, birthday_day: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day).padStart(2, '0')}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={formData.birthday_month}
                onValueChange={(value) => setFormData({ ...formData, birthday_month: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {[
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                  ].map((month, index) => (
                    <SelectItem key={index + 1} value={String(index + 1).padStart(2, '0')}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={formData.birthday_year}
                onValueChange={(value) => setFormData({ ...formData, birthday_year: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>

        <Separator className="my-6" />

        {/* Change Password Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Update your password to keep your account secure
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Enter new password"
                  maxLength={100}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  maxLength={100}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleChangePassword} 
              disabled={isChangingPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              variant="secondary"
            >
              {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Password
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
