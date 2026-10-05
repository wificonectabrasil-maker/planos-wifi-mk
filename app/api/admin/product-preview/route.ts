import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin/auth";
import * as cheerio from "cheerio";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { url } = await req.json();

    if (!url) return NextResponse.json({ error: "URL necessária" }, { status: 400 });

    console.log("[Amazon Scraper] Processando:", url);

    // Simular Browser
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    };

    const response = await fetch(url, { headers, redirect: 'follow' });

    console.log("[Amazon Scraper] Status:", response.status);

    if (!response.ok) {
      return NextResponse.json({
        title: "",
        image: "",
        price: "",
        rating: 0,
        fallback: true
      });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extrair dados
    let title =
      $('meta[property="og:title"]').attr('content') ||
      $('#productTitle').text().trim() ||
      $('title').text().trim();

    let image =
      $('meta[property="og:image"]').attr('content') ||
      $('#landingImage').attr('data-old-hires') ||
      $('#landingImage').attr('src') ||
      $('#imgBlkFront').attr('src');

    // Fallback dinâmico da imagem
    if (!image) {
      const dynamicData = $('#landingImage').attr('data-a-dynamic-image');
      if (dynamicData) {
        try {
          const json = JSON.parse(dynamicData);
          const keys = Object.keys(json);
          if (keys.length > 0) image = keys[0];
        } catch (e) { }
      }
    }

    // Preço
    let price =
      $('.a-price .a-offscreen').first().text().trim() ||
      $('#priceblock_ourprice').text().trim() ||
      $('#priceblock_dealprice').text().trim();

    // Rating
    let rating = 4.5;
    const ratingText =
      $('span[data-hook="rating-out-of-text"]').text().trim() ||
      $('.a-icon-alt').first().text().trim();

    const ratingMatch = ratingText.match(/(\d+[.,]\d+)/);
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1].replace(',', '.'));
    }

    // Limpar título
    if (title) {
      title = title.replace(/ \| Amazon.com.br/g, '').replace(/Amazon.com.br: /g, '').trim();
    }

    console.log("[Amazon Scraper] Extraído:", {
      title: title?.substring(0, 50),
      image: image?.substring(0, 50),
      price,
      rating
    });

    // Se não achou nada, retornar dados vazios (sem erro)
    if (!title && !image) {
      console.warn("[Amazon Scraper] Dados vazios - possível bloqueio");
      return NextResponse.json({
        title: "",
        image: "",
        price: "",
        rating: 0,
        fallback: true
      });
    }

    return NextResponse.json({
      title: title || '',
      image: image || '',
      price: price || 'R$ --',
      rating
    });

  } catch (error) {
    console.error("[Amazon Scraper] Erro:", error);
    return NextResponse.json({
      title: "",
      image: "",
      price: "",
      rating: 0,
      fallback: true,
      error: String(error)
    });
  }
}
