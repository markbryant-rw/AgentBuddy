import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Globe, Users, UserCircle, Building, X } from "lucide-react";
import { useCreatePost, PostVisibility } from "@/hooks/useSocialPosts";
import { RichTextPostEditor } from "./RichTextPostEditor";
import { useImageUpload } from "@/hooks/useImageUpload";

const visibilityOptions = [
  { value: 'public', label: 'Public', icon: Globe },
  { value: 'team_only', label: 'Team Only', icon: Users },
  { value: 'friends_only', label: 'Friends Only', icon: UserCircle },
  { value: 'office_only', label: 'Office Only', icon: Building },
];

export function CreatePostForm() {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [mentionedUsers, setMentionedUsers] = useState<Set<string>>(new Set());
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const createPost = useCreatePost();
  const { uploadImage } = useImageUpload();

  const handleImagePaste = async (file: File) => {
    if (images.length >= 4) {
      return; // Max 4 images
    }
    const url = await uploadImage(file);
    if (url) {
      setImages(prev => [...prev, url]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleMentionAdd = (userId: string) => {
    setMentionedUsers((prev) => new Set(prev).add(userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    await createPost.mutateAsync({
      content: content.trim(),
      post_type: 'general_update',
      visibility,
      images,
      mentionedUserIds: Array.from(mentionedUsers),
    });

    setContent("");
    setImages([]);
    setMentionedUsers(new Set());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share an Update</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <RichTextPostEditor
              value={content}
              onChange={setContent}
              placeholder="What's on your mind? Share your wins, challenges, or updates with your team... (Type @ to mention, paste or drop images)"
              onImagePaste={handleImagePaste}
              onMentionAdd={handleMentionAdd}
            />
          </div>

          {/* Image Previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {images.map((image, index) => (
                <div key={image} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={image} 
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label htmlFor="visibility" className="text-sm text-muted-foreground">
                Who can see this?
              </Label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as PostVisibility)}>
                <SelectTrigger id="visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visibilityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={!content.trim() || createPost.isPending}
            >
              {createPost.isPending ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
