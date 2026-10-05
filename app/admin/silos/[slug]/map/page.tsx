import { notFound } from "next/navigation";
import { SiloMapPage } from "@/components/silo/SiloMapPage";
import { adminGetSiloBySlug } from "@/lib/db";
import type { SiloMapData } from "@/components/silo/types";

type Props = {
    params: Promise<{
        slug: string;
    }>;
};

// Buscar dados reais do silo
async function getSiloMapData(siloId: string): Promise<SiloMapData> {
    const { getAdminDatabase } = await import("@/lib/database");
    const database = getAdminDatabase();

    // 1. Buscar APENAS posts com hierarquia definida (role + position)
    const { data: siloPosts, error: siloPostsError } = await database
        .from("silo_posts")
        .select(`
            post_id,
            role,
            position,
            posts: post_id (
                id,
                title,
                slug
            )
        `)
        .eq("silo_id", siloId)
        .not("role", "is", null)
        .not("position", "is", null)
        .order("position", { ascending: true });

    if (siloPostsError) {
        console.error("Erro ao buscar posts do silo:", siloPostsError);
        return { nodes: [], edges: [] };
    }

    if (!siloPosts || siloPosts.length === 0) {
        console.log("Nenhum post com hierarquia definida neste silo");
        return { nodes: [], edges: [] };
    }

    // 2. Buscar links entre posts
    const postIds = siloPosts.map((sp: any) => sp.post_id);

    const { data: links, error: linksError } = await database
        .from("post_links")
        .select("*")
        .in("source_post_id", postIds)
        .in("target_post_id", postIds);

    if (linksError) {
        console.error("Erro ao buscar links:", linksError);
    }

    // 3. Contar links de entrada e saída
    const linkCounts = postIds.reduce((acc: any, postId: string) => {
        acc[postId] = {
            inCount: links?.filter((l: any) => l.target_post_id === postId).length || 0,
            outCount: links?.filter((l: any) => l.source_post_id === postId).length || 0,
        };
        return acc;
    }, {} as Record<string, { inCount: number; outCount: number }>);

    // 4. Criar nodes
    const nodes: SiloMapData["nodes"] = siloPosts
        .filter((sp: any) => sp.posts)
        .map((sp: any) => ({
            id: sp.post_id,
            postId: sp.post_id,
            title: sp.posts.title || "Sem título",
            role: sp.role as ("PILLAR" | "SUPPORT" | "AUX"),
            position: sp.position,
            inCount: linkCounts[sp.post_id]?.inCount || 0,
            outCount: linkCounts[sp.post_id]?.outCount || 0,
        }));

    // 5. Criar edges (linhas entre posts)
    const edges: SiloMapData["edges"] = (links || [])
        .filter((link: any) => {
            const sourceInSilo = siloPosts.find((sp: any) => sp.post_id === link.source_post_id);
            const targetInSilo = siloPosts.find((sp: any) => sp.post_id === link.target_post_id);
            return sourceInSilo && targetInSilo;
        })
        .map((link: any) => {
            const sourceNode = siloPosts.find((sp: any) => sp.post_id === link.source_post_id);
            const targetNode = siloPosts.find((sp: any) => sp.post_id === link.target_post_id);

            return {
                id: link.id,
                source: sourceNode?.post_id || "",
                target: targetNode?.post_id || "",
                anchorText: link.anchor_text || "Link",
                quality: "UNKNOWN" as const,
            };
        });

    return { nodes, edges };
}

export default async function SiloMapRoute({ params }: Props) {
    const { slug } = await params;
    let silo: Awaited<ReturnType<typeof adminGetSiloBySlug>> = null;
    try {
        silo = await adminGetSiloBySlug(slug);
    } catch (error) {
        console.error("[SILO-MAP] falha ao carregar silo por slug", error);
        silo = null;
    }

    if (!silo) {
        notFound();
    }

    let mapData: SiloMapData = { nodes: [], edges: [] };
    try {
        mapData = await getSiloMapData(silo.id);
    } catch (error) {
        console.error("[SILO-MAP] falha ao montar mapa", error);
        mapData = { nodes: [], edges: [] };
    }

    return (
        <SiloMapPage
            siloId={silo.id}
            siloName={silo.name}
            initialData={mapData}
            initialHealth={null}
        />
    );
}
