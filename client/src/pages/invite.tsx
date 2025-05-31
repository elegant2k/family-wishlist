import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Heart, Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/auth";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

const childRegisterSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  password: z.string().min(4, "Passord må være minst 4 tegn"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passordene stemmer ikke overens",
  path: ["confirmPassword"],
});

const adultRegisterSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passordene stemmer ikke overens",
  path: ["confirmPassword"],
});

type ChildRegisterData = z.infer<typeof childRegisterSchema>;
type AdultRegisterData = z.infer<typeof adultRegisterSchema>;

interface FamilyGroup {
  id: number;
  name: string;
  inviteCode: string;
  memberCount: number;
}

export default function InvitePage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [familyGroup, setFamilyGroup] = useState<FamilyGroup | null>(null);
  const [loadingFamily, setLoadingFamily] = useState(true);
  const { toast } = useToast();

  const childForm = useForm<ChildRegisterData>({
    resolver: zodResolver(childRegisterSchema),
    defaultValues: {
      name: "",
      password: "",
      confirmPassword: "",
    },
  });

  const adultForm = useForm<AdultRegisterData>({
    resolver: zodResolver(adultRegisterSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Load family group info
  useEffect(() => {
    const fetchFamilyInfo = async () => {
      if (!inviteCode) return;
      
      try {
        const response = await fetch(`/api/family-groups/invite/${inviteCode}`);
        if (response.ok) {
          const data = await response.json();
          setFamilyGroup(data);
        } else {
          toast({
            title: "Ugyldig invitasjonskode",
            description: "Denne invitasjonslinken er ikke gyldig eller har utløpt.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Kunne ikke laste familiegruppe",
          description: "Noe gikk galt ved lasting av invitasjonen.",
          variant: "destructive",
        });
      } finally {
        setLoadingFamily(false);
      }
    };

    fetchFamilyInfo();
  }, [inviteCode, toast]);

  const handleChildRegister = async (data: ChildRegisterData) => {
    setIsLoading(true);
    try {
      // Register child with family code
      await auth.register(data.name, "", data.password, true, inviteCode);
      toast({ title: "Velkommen til familien!" });
    } catch (error: any) {
      toast({
        title: "Registrering feilet",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdultRegister = async (data: AdultRegisterData) => {
    setIsLoading(true);
    try {
      // Register adult and join family group
      await auth.register(data.name, data.email || "", data.password);
      // Join the family group
      const response = await fetch('/api/family-groups/join', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...auth.getAuthHeaders()
        },
        body: JSON.stringify({ inviteCode }),
      });
      
      if (!response.ok) throw new Error('Kunne ikke bli med i familiegruppen');
      
      toast({ title: "Velkommen til familien!" });
    } catch (error: any) {
      toast({
        title: "Registrering feilet",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingFamily) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-warm to-orange-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Heart className="h-12 w-12 text-red-400 fill-current mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Laster invitasjon...</p>
        </div>
      </div>
    );
  }

  if (!familyGroup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-warm to-orange-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <Heart className="h-12 w-12 text-red-400 fill-current mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Ugyldig invitasjon</h1>
            <p className="text-gray-600">
              Denne invitasjonslinken er ikke gyldig eller har utløpt.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-warm to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Heart className="h-12 w-12 text-red-400 fill-current" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Du er invitert!</h1>
          <p className="mt-2 text-gray-600">
            Bli med i familiegruppen <strong>{familyGroup.name}</strong>
          </p>
          <div className="flex items-center justify-center mt-3 space-x-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm text-gray-600">
              {familyGroup.memberCount} medlemmer
            </span>
          </div>
        </div>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Opprett din konto</CardTitle>
            <CardDescription className="text-center">
              Velg kontotype for å bli med i familien
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="child" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="child">Barn</TabsTrigger>
                <TabsTrigger value="adult">Voksen</TabsTrigger>
              </TabsList>

              <TabsContent value="child">
                <Form {...childForm}>
                  <form onSubmit={childForm.handleSubmit(handleChildRegister)} className="space-y-4">
                    <FormField
                      control={childForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ditt navn</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ditt kallenavn"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={childForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passord</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Velg et passord"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={childForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bekreft passord</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Skriv passordet igjen"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? "Oppretter konto..." : "Bli med som barn"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="adult">
                <Form {...adultForm}>
                  <form onSubmit={adultForm.handleSubmit(handleAdultRegister)} className="space-y-4">
                    <FormField
                      control={adultForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fullt navn</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ditt fulle navn"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={adultForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-post</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="din@epost.no"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={adultForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passord</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Velg et passord"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={adultForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bekreft passord</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Skriv passordet igjen"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? "Oppretter konto..." : "Bli med som voksen"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}