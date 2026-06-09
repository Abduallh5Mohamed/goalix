"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  ShieldCheck,
  Target,
} from "lucide-react";

type GoalixAuthShellProps = {
  children: React.ReactNode;
  badge: string;
  headline: React.ReactNode;
  description: string;
  metricLabel: string;
  metricValue: string;
};

const featureCards = [
  {
    Icon: BrainCircuit,
    title: "AI-powered",
    text: "Advanced analytics driving real performance decisions.",
  },
  {
    Icon: Target,
    title: "Performance focused",
    text: "Data-driven insights for every training advantage.",
  },
  {
    Icon: ShieldCheck,
    title: "Secure access",
    text: "Protected sessions for players, parents, coaches and admins.",
  },
  {
    Icon: BarChart3,
    title: "Actionable insights",
    text: "Turn match data into clear next actions.",
  },
];

export function GoalixAuthShell({
  children,
  badge,
  headline,
  description,
  metricLabel,
  metricValue,
}: GoalixAuthShellProps) {
  return (
    <div className="goalix-login-system">
      <section className="goalix-login-story" aria-label="Goalix performance access preview">
        <div className="goalix-login-story-bg" />
        <div className="goalix-login-story-header">
          <Image src="/Logo.png" alt="Goalix" width={146} height={44} priority />
          <Link href="/" className="goalix-login-home">
            Home
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="goalix-login-copy">
          <span>{badge}</span>
          <h1>{headline}</h1>
          <p>{description}</p>
        </div>

        <div className="goalix-login-analytics-card">
          <span className="goalix-login-pulse" />
          <div>
            <strong>{metricValue}</strong>
            <p>{metricLabel}</p>
          </div>
          <Activity size={24} />
        </div>

        <div className="goalix-login-heatmap-card" aria-hidden="true">
          <div />
          <span />
        </div>

        <div className="goalix-login-live-strip">
          <span />
          <div>
            <strong>Live Match Analysis</strong>
            <p>Real-time data. Actionable insights.</p>
          </div>
          <em>Live</em>
        </div>

        <div className="goalix-login-feature-row">
          {featureCards.map(({ Icon, title, text }) => (
            <article key={title}>
              <Icon size={26} />
              <strong>{title}</strong>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="goalix-login-panel-shell">
        <div className="goalix-login-mobile-brand">
          <Image src="/Logo.png" alt="Goalix" width={130} height={39} priority />
          <Link href="/">Home</Link>
        </div>
        {children}
      </section>
    </div>
  );
}
