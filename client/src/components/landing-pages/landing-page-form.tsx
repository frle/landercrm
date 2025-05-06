import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { insertLandingPageSchema, LandingPage, Category } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CloudUpload } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface LandingPageFormProps {
  isOpen: boolean;
  onClose: () => void;
  landingPage?: LandingPage;
}

const formSchema = insertLandingPageSchema.extend({
  id: z.number().optional(),
  screenshotFile: z.instanceof(File).optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export function LandingPageForm({ isOpen, onClose, landingPage }: LandingPageFormProps) {
  const { toast } = useToast();
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const isEditing = !!landingPage;

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Set up form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: landingPage?.name || "",
      description: landingPage?.description || "",
      categoryId: landingPage?.categoryId || null,
      mainHeadline: landingPage?.mainHeadline || "",
      liveUrl: landingPage?.liveUrl || "",
      zipFileUrl: landingPage?.zipFileUrl || "",
      screenshotFile: null,
    },
  });

  // Update form values when landingPage changes
  useEffect(() => {
    if (landingPage) {
      form.reset({
        name: landingPage.name,
        description: landingPage.description || "",
        categoryId: landingPage.categoryId,
        mainHeadline: landingPage.mainHeadline || "",
        liveUrl: landingPage.liveUrl || "",
        zipFileUrl: landingPage.zipFileUrl || "",
        screenshotFile: null,
      });
      
      // Show existing screenshot preview if available
      if (landingPage.screenshotUrl) {
        setScreenshotPreview(landingPage.screenshotUrl);
      }
    } else {
      form.reset({
        name: "",
        description: "",
        categoryId: null,
        mainHeadline: "",
        liveUrl: "",
        zipFileUrl: "",
        screenshotFile: null,
      });
      setScreenshotPreview(null);
    }
  }, [landingPage, form]);

  // Handle screenshot file change
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue("screenshotFile", file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // This function is no longer needed as we're using a URL field

  // Create landing page mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", "/api/landing-pages", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Landing page created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/landing-pages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-landing-pages"] });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update landing page mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const res = await apiRequest("PUT", `/api/landing-pages/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Landing page updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/landing-pages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-landing-pages"] });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: FormValues) => {
    const formData = new FormData();
    
    // Add text fields
    formData.append("name", values.name);
    
    if (values.description) {
      formData.append("description", values.description);
    }
    
    if (values.categoryId !== null) {
      formData.append("categoryId", String(values.categoryId));
    }
    
    if (values.mainHeadline) {
      formData.append("mainHeadline", values.mainHeadline);
    }
    
    if (values.liveUrl) {
      formData.append("liveUrl", values.liveUrl);
    }
    
    if (values.zipFileUrl) {
      formData.append("zipFileUrl", values.zipFileUrl);
    }
    
    // Add files
    if (values.screenshotFile) {
      formData.append("screenshot", values.screenshotFile);
    }
    
    if (isEditing && landingPage) {
      updateMutation.mutate({ id: landingPage.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Landing Page" : "Add New Landing Page"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the details of this landing page." 
              : "Add a new landing page to your library."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g. Weight Loss Program" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of the landing page..." 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    value={field.value?.toString() || ""}
                    onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="mainHeadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Main Headline</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="E.g. Lose Weight Fast With Our Program!" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="liveUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Live URL</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://example.com/landing-page" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <Label>Screenshot</Label>
              <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-input px-6 py-4">
                <div className="space-y-1 text-center">
                  {screenshotPreview ? (
                    <div className="relative w-full">
                      <img 
                        src={screenshotPreview} 
                        alt="Screenshot preview" 
                        className="h-32 object-cover mx-auto rounded-md"
                      />
                      <p className="mt-2 text-sm text-muted-foreground">
                        {form.watch("screenshotFile")?.name || "Current screenshot"}
                      </p>
                    </div>
                  ) : (
                    <>
                      <CloudUpload className="mx-auto h-12 w-12 text-muted-foreground" />
                      <div className="flex text-sm">
                        <label
                          htmlFor="screenshot-upload"
                          className="relative cursor-pointer font-medium text-primary hover:text-primary/80"
                        >
                          <span>Upload a file</span>
                          <input
                            id="screenshot-upload"
                            name="screenshot-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={handleScreenshotChange}
                          />
                        </label>
                        <p className="pl-1 text-muted-foreground">or drag and drop</p>
                      </div>
                      <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="zipFileUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP File URL</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://example.com/landing-template.zip" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Enter a URL to a hosted ZIP file containing the landing page template
                  </p>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {isEditing ? "Update Landing Page" : "Add Landing Page"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
