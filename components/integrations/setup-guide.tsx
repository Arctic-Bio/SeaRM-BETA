"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Copy, ExternalLink, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

interface Props {
  webhookUrl: string
  source: string
}

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(`${label} copied`)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Could not copy")
    }
  }
  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 truncate rounded-md border bg-muted/50 px-3 py-2 text-xs font-mono">{value}</code>
      <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0" onClick={copy}>
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  )
}

const GUIDES: Record<string, { title: string; steps: string[]; link?: { label: string; href: string } }> = {
  google_forms: {
    title: "Connect Google Forms via Zapier",
    steps: [
      "In Zapier, create a new Zap and choose 'Google Forms' as the trigger app with the event 'New Form Response'.",
      "Connect your Google account and select the form you use for crew applications.",
      "Add an action step and choose 'Webhooks by Zapier' -> 'POST'.",
      "Paste the webhook URL above into the URL field.",
      "Set Payload Type to 'JSON', then map each Google Forms question into the Data fields (key = question text, value = the answer).",
      "Turn the Zap on. Each new form response now creates a crew profile automatically.",
    ],
    link: { label: "Open Zapier", href: "https://zapier.com/app/editor" },
  },
  zapier: {
    title: "Connect any app via Webhooks by Zapier",
    steps: [
      "Create a Zap with your form/app of choice as the trigger.",
      "Add 'Webhooks by Zapier' -> 'POST' as the action.",
      "Paste the webhook URL above as the URL.",
      "Set Payload Type to 'JSON' and map your form fields into the Data section.",
      "Test the step - you should see a success response - then turn the Zap on.",
    ],
    link: { label: "Open Zapier", href: "https://zapier.com/app/editor" },
  },
  typeform: {
    title: "Connect Typeform",
    steps: [
      "Easiest: use Zapier with the 'Typeform' trigger and a 'Webhooks by Zapier' POST action pointing at the URL above.",
      "Or native: in Typeform go to Connect -> Webhooks and add the webhook URL above.",
      "Typeform sends nested JSON - the field mapper flattens it automatically, and Auto-map detects common fields.",
    ],
    link: { label: "Typeform Webhooks", href: "https://www.typeform.com/help/a/webhooks-360029573471/" },
  },
  jotform: {
    title: "Connect Jotform",
    steps: [
      "In Jotform, open your form -> Settings -> Integrations and search for 'Webhooks'.",
      "Add the webhook URL above and save.",
      "Submissions are posted as form data and mapped into crew profiles automatically.",
    ],
    link: { label: "Jotform Webhooks", href: "https://www.jotform.com/help/245-how-to-setup-a-webhook-with-jotform/" },
  },
  microsoft_forms: {
    title: "Connect Microsoft Forms",
    steps: [
      "Use Power Automate (Flow): trigger 'When a new response is submitted'.",
      "Add an HTTP action -> Method POST -> URI = the webhook URL above.",
      "Set the body to JSON with your form questions as keys.",
      "Alternatively, use Zapier's Microsoft Forms integration with a Webhooks POST action.",
    ],
    link: { label: "Power Automate", href: "https://make.powerautomate.com/" },
  },
  tally: {
    title: "Connect Tally",
    steps: [
      "In Tally, open your form -> Integrations -> Webhooks.",
      "Add the webhook URL above.",
      "Tally posts JSON; Auto-map handles common fields out of the box.",
    ],
    link: { label: "Tally Webhooks", href: "https://tally.so/help/webhooks" },
  },
  make: {
    title: "Connect Make (Integromat)",
    steps: [
      "Create a scenario with your form app as the trigger module.",
      "Add an 'HTTP -> Make a request' module.",
      "Method POST, URL = the webhook URL above, Body type = Raw / JSON.",
      "Map your form fields into the JSON body and run the scenario.",
    ],
    link: { label: "Open Make", href: "https://www.make.com/" },
  },
  custom: {
    title: "Connect any custom source",
    steps: [
      "Send an HTTP POST request to the webhook URL above.",
      "Use Content-Type: application/json with a flat or nested object of field labels and values.",
      "Form-encoded bodies (application/x-www-form-urlencoded) are also accepted.",
      "Define mapping rules below, or rely on Auto-map for common fields.",
    ],
  },
}

export function SetupGuide({ webhookUrl, source }: Props) {
  const guide = GUIDES[source] || GUIDES.custom

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Webhook URL</p>
        <CopyField value={webhookUrl} label="Webhook URL" />
        <p className="text-[11px] text-muted-foreground mt-1.5">
          This unique URL is your API key. Anyone with it can submit profiles, so keep it private. Rotate it any time from Settings.
          The URL automatically uses whatever domain this app is deployed on.
        </p>
      </div>

      <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 shrink-0 text-warning mt-0.5" />
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-foreground">
              Getting a 401 / &quot;Unauthorized&quot; from Zapier? Disable Vercel Deployment Protection.
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              A 401 does not come from this app. It means the deployment is behind Vercel Deployment Protection
              (Vercel Authentication / Password / SSO), which blocks every external request before it reaches the
              webhook. External tools like Zapier cannot authenticate against it.
            </p>
            <ul className="flex flex-col gap-1 text-[11px] text-muted-foreground leading-relaxed list-disc pl-4">
              <li>Open your Vercel project → Settings → Deployment Protection.</li>
              <li>Set Vercel Authentication to &quot;Disabled&quot; (or enable it for Preview only and use your Production domain).</li>
              <li>Make sure the webhook URL above is your live production/custom domain — not a preview or sandbox URL.</li>
              <li>Re-test the Zap. A correct call returns HTTP 200 with an <code className="font-mono">ok: true</code> body.</li>
            </ul>
            <a
              href="https://vercel.com/docs/deployment-protection"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-warning hover:underline"
            >
              Deployment Protection docs <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Badge variant="outline" className="text-[9px]">Guide</Badge>
            {guide.title}
          </h4>
          {guide.link && (
            <a href={guide.link.href} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                {guide.link.label}<ExternalLink className="h-3 w-3" />
              </Button>
            </a>
          )}
        </div>
        <ol className="flex flex-col gap-2">
          {guide.steps.map((step, i) => (
            <li key={i} className="flex gap-2.5 text-xs text-muted-foreground leading-relaxed">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{i + 1}</span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Test from your terminal</p>
        <code className="block whitespace-pre-wrap break-all rounded-md bg-background border px-3 py-2 text-[11px] font-mono text-muted-foreground">
{`curl -X POST '${webhookUrl}' \\
  -H 'Content-Type: application/json' \\
  -d '{"First Name":"Brytan","Last Name":"Kelly","Email Address":"brytan@example.com","Current Occupation":"Medic"}'`}
        </code>
      </div>
    </div>
  )
}
