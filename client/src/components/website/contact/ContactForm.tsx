"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Mail, Phone, Send } from "lucide-react";
import Link from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export type ContactFormProps = {
  /**
   * Optional prefilled values (useful if you want to inject from URL params/user profile).
   */
  initialValues?: Partial<{
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
  }>;

  /**
   * Called when the user submits the form.
   * If omitted, the form will simulate a request (same behavior as the previous inline implementation).
   */
  onSubmit?: (data: {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
  }) => Promise<void>;

  /**
   * Optional contact shortcuts rendered under the form (e.g. from metadata).
   */
  contactShortcuts?: {
    msisdn?: string;
    email?: string;
  };
};

export default function ContactForm(props: ContactFormProps) {
  const t = useTranslations("ContactForm");

  const [formData, setFormData] = useState({
    name: props.initialValues?.name ?? "",
    email: props.initialValues?.email ?? "",
    phone: props.initialValues?.phone ?? "",
    subject: props.initialValues?.subject ?? "",
    message: props.initialValues?.message ?? "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      if (props.onSubmit) {
        await props.onSubmit(formData);
      } else {
        // Default behavior: simulate API call (keeps parity with old page implementation)
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      setIsSubmitted(true);
      resetForm();

      // Reset success message after 5 seconds
      setTimeout(() => {
        setIsSubmitted(false);
      }, 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Alert */}
      {isSubmitted && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {t("alerts.success")}
          </AlertDescription>
        </Alert>
      )}

      {/* Optional shortcuts */}
      {(props.contactShortcuts?.msisdn || props.contactShortcuts?.email) && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent>
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">{t("shortcuts.title")}</h2>
              <p className="text-muted-foreground mx-auto">
                {t("shortcuts.description")}
              </p>

              <div className="flex gap-4 justify-center flex-wrap">
                {props.contactShortcuts?.msisdn && (
                  <Button size="lg">
                    <a href={`tel:${props.contactShortcuts.msisdn}`}>
                      <Phone className="mr-2 h-4 w-4" />
                      {t("shortcuts.callHotline")}
                    </a>
                  </Button>
                )}

                {props.contactShortcuts?.email && (
                  <Button size="lg" variant="outline">
                    <a href={`mailto:${props.contactShortcuts.email}`}>
                      <Mail className="mr-2 h-4 w-4" />
                      {t("shortcuts.sendEmail")}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
