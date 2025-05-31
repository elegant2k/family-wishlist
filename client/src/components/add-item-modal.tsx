import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, CloudUpload, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertWishlistItemSchema } from "@shared/schema";
import { z } from "zod";

const formSchema = insertWishlistItemSchema.extend({
  price: z.coerce.number().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddItemModal({ open, onOpenChange }: AddItemModalProps) {
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price: undefined,
      category: "",
      priority: "medium",
      storeLink: "",
      imageUrl: "",
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest('POST', '/api/wishlist-items', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wishlists/my'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wishlists/family'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      toast({ title: "Nytt ønske lagt til!" });
      onOpenChange(false);
      form.reset();
      setUploadedFileName(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Kunne ikke legge til ønske", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleSubmit = (data: FormData) => {
    addItemMutation.mutate(data);
  };

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        setUploadedFileName(file.name);
        // In a real app, you'd upload the file to a server and get a URL
        // For now, we'll just set a placeholder URL
        form.setValue('imageUrl', `uploaded/${file.name}`);
      }
    });
    input.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      const file = files[0];
      setUploadedFileName(file.name);
      form.setValue('imageUrl', `uploaded/${file.name}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Legg til nytt ønske
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produktnavn *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="F.eks. iPhone 15 Pro" 
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beskrivelse</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Beskriv ønsket ditt..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pris (kr)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Velg kategori" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="clothes">Klær</SelectItem>
                        <SelectItem value="electronics">Elektronikk</SelectItem>
                        <SelectItem value="books">Bøker</SelectItem>
                        <SelectItem value="toys">Leker</SelectItem>
                        <SelectItem value="sport">Sport</SelectItem>
                        <SelectItem value="music">Musikk</SelectItem>
                        <SelectItem value="home">Hjem</SelectItem>
                        <SelectItem value="other">Annet</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioritet</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="high" id="high" />
                        <Label htmlFor="high" className="flex items-center text-sm">
                          <span className="w-3 h-3 bg-red-400 rounded-full mr-2" />
                          Høy
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="medium" id="medium" />
                        <Label htmlFor="medium" className="flex items-center text-sm">
                          <span className="w-3 h-3 bg-yellow-400 rounded-full mr-2" />
                          Medium
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="low" id="low" />
                        <Label htmlFor="low" className="flex items-center text-sm">
                          <span className="w-3 h-3 bg-green-400 rounded-full mr-2" />
                          Lav
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="storeLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link til butikk</FormLabel>
                  <FormControl>
                    <Input 
                      type="url" 
                      placeholder="https://..."
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div>
              <Label className="text-sm font-medium">Produktbilde</Label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer mt-2"
                onClick={handleFileUpload}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {uploadedFileName ? (
                  <>
                    <CheckCircle className="mx-auto text-3xl text-secondary mb-2" size={48} />
                    <p className="text-sm text-gray-600">Bilde lastet opp: {uploadedFileName}</p>
                  </>
                ) : (
                  <>
                    <CloudUpload className="mx-auto text-3xl text-gray-400 mb-2" size={48} />
                    <p className="text-sm text-gray-600">Klikk for å laste opp bilde eller dra og slipp her</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF opp til 10MB</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Avbryt
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={addItemMutation.isPending}
              >
                {addItemMutation.isPending ? "Legger til..." : "Legg til ønske"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
