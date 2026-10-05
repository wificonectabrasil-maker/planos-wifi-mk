"use client";

import { motion } from "motion/react";
import type { SiloConfig } from "@/lib/silo-config";
import { SITE_BRAND_TAGLINE, SITE_NAME } from "@/lib/site";

type SiloHubProps = {
  silo: Pick<SiloConfig, "slug" | "title" | "description">;
  editorialGroups: readonly string[];
};

export function SiloHub({ silo, editorialGroups }: SiloHubProps) {
  // Paleta pastel orgânica para os grupos editoriais gerada pelo Stitch (Menta, Lavanda, Nude/Pêssego)
  const groupColors = [
    "from-[#e8f5e9]/60 to-[#c8e6c9]/30", // Menta suave
    "from-[#fff3e0]/60 to-[#ffe0b2]/30", // Pêssego
    "from-[#e3f2fd]/60 to-[#bbdefb]/30", // Ar Brisa
    "from-[#f3e5f5]/60 to-[#e1bee7]/30", // Lavanda
    "from-[#fff8e1]/60 to-[#ffecb3]/30", // Mel
    "from-[#efebe9]/60 to-[#d7ccc8]/30", // Argila
  ];

  return (
    <article className="overflow-hidden bg-[#FAF9F6]">
      {/* 
        ================================================================
        1. HERO SECTION (HUB)
        Padrão Editorial High-End. Serif massivo.
        ================================================================
      */}
      <section className="relative px-4 pt-20 pb-32 md:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-5xl text-center"
        >
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#885038]">
            {SITE_NAME} · Coleção Editorial
          </p>
          <h1 className="font-['Milchella'] text-5xl leading-[1.05] tracking-tight text-[#295b2b] md:text-7xl">
            {silo.title}
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[#455358] md:text-xl">
            {silo.description}
          </p>
        </motion.div>
      </section>

      {/* 
        ================================================================
        DIVISOR ONDA 1 (CREME PARA BRANCO TEXTURIZADO)
        ================================================================
      */}
      <div className="relative -mb-1 w-full text-white">
        <svg viewBox="0 0 1440 120" fill="currentColor" preserveAspectRatio="none" className="h-16 w-full sm:h-24 md:h-32">
          <path d="M0,64 C480,150 960,-20 1440,64 L1440,120 L0,120 Z" />
        </svg>
      </div>

      {/* 
        ================================================================
        2. CONTEÚDOS & GRUPOS (FUNDO BRANCO PURO)
        Cards com Glassmorphism Translúcido e Gradientes Sutis.
        ================================================================
      */}
      <section className="relative bg-white px-4 py-16 md:py-24">
        <div className="mx-auto w-full max-w-6xl space-y-20">
          
          {/* Pilar principal CTA */}
          <motion.section 
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="group relative overflow-hidden rounded-[2rem] border border-[#e3e3de] bg-[#FAF9F6] p-8 shadow-sm transition hover:shadow-xl md:p-12"
          >
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#fce4ec] opacity-40 blur-3xl transition group-hover:scale-150" />
            <p className="relative z-10 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#885038]">Guia Essencial</p>
            <h2 className="relative z-10 mt-3 font-['Milchella'] text-3xl text-[#1a1c19] md:text-4xl">Página pilar do tema</h2>
            <p className="relative z-10 mt-4 max-w-2xl text-base leading-relaxed text-[#5d6b71]">
              Este hub reúne os conteúdos principais a respeito de <strong>{silo.title}</strong>. Se você está caindo de paraquedas, recomendamos começar a leitura pelo artigo base.
            </p>
            <button className="relative z-10 mt-8 rounded-full bg-[#295b2b] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#1e5122]">
              Ler guia completo
            </button>
          </motion.section>

          {/* Grid de Grupos Editoriais */}
          <section className="space-y-8">
            <h2 className="font-['Milchella'] text-3xl text-[#1a1c19] md:text-4xl">Grupos editoriais</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {editorialGroups.map((group, index) => {
                const bgGradient = groupColors[index % groupColors.length];
                return (
                  <motion.article
                    key={group}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={`relative overflow-hidden rounded-3xl border border-black/5 bg-gradient-to-br ${bgGradient} p-8 shadow-sm backdrop-blur-md transition-shadow hover:shadow-lg`}
                  >
                    <div className="absolute inset-0 bg-white/40" />
                    <p className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-[#a59182]">Grupo {index + 1}</p>
                    <h3 className="relative z-10 mt-3 font-['Milchella'] text-2xl text-[#1a1c19]">{group}</h3>
                    <p className="relative z-10 mt-3 text-sm text-[#5d6b71]">Coleção de guias de suporte para a tomada de decisão.</p>
                  </motion.article>
                );
              })}
            </div>
          </section>

          {/* Seção Em breve */}
          <motion.section 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex items-center justify-center rounded-3xl border border-dashed border-[#c1c9bc] bg-[#f4f4ef] p-12 text-center"
          >
            <p className="text-sm font-medium text-[#72796e]">
              Em breve: posts deste silo serão enriquecidos com rotinas e indicações precisas.
            </p>
          </motion.section>

        </div>
      </section>
    </article>
  );
}
