# Tailwind 4 System

Este documento define como usar Tailwind 4 no Mini WordPress sem misturar sistema administrativo com identidade da marca.

## Papel do Tailwind

Tailwind e ferramenta de composicao. Ele nao deve ser a fonte primaria de identidade do Mini WordPress.

O Mini WordPress deve depender de tokens CSS de sistema e classes estruturais. Tailwind pode montar grid, flex, tamanhos e estados, mas cores, fontes e padroes globais devem vir de variaveis.

## Separacao obrigatoria

### Admin

Escopo:

- `.admin-app`

Regras:

- Sempre dark mode.
- Fonte propria do sistema.
- Gradientes e tokens administrativos.
- Overrides de seguranca para classes claras.
- Nao herdar identidade da marca.

### Preview publico

Escopo:

- `.editor-public-preview`

Regras:

- Pertence a marca.
- Pode usar fonte e cores publicas.
- Nao recebe compactacao do admin.
- Nao recebe dark hardening do admin.

### Frontend template

Escopo:

- classes `system-*`
- variaveis publicas da marca

Regras:

- Estrutura e Core/Template.
- Cor, fonte e efeitos sao Brand.

## Tokens recomendados

Admin:

```css
.admin-app {
  --surface: ...;
  --surface-2: ...;
  --surface-3: ...;
  --border: ...;
  --text: ...;
  --muted: ...;
  --muted-2: ...;
  --accent: ...;
  --accent-2: ...;
  --danger: ...;
  --warning: ...;
  --success: ...;
  --admin-font-ui: ...;
  --admin-font-mono: ...;
}
```

Marca:

```css
:root {
  --brand-bg: ...;
  --brand-ink: ...;
  --brand-hot: ...;
  --brand-muted: ...;
  --brand-font-heading: ...;
  --brand-font-body: ...;
}
```

## Hardening de dark mode

O admin atual usa rede de seguranca para interceptar classes claras dentro de `.admin-app`.

Exemplos:

- `bg-white` -> `var(--surface)`
- `text-zinc-900` -> `var(--text)`
- `border-zinc-200` -> `var(--border)`

Essa protecao deve continuar existindo, mas sempre excluindo `.editor-public-preview`.

## Padrao de classes

Preferir:

```tsx
<section className="admin-pane">
  ...
</section>
```

Evitar:

```tsx
<section className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900">
  ...
</section>
```

Motivo:

- A primeira forma e portavel.
- A segunda forma quebra dark mode e cria retrabalho ao exportar o sistema.

## Classes estruturais do frontend

O menu publico de silos deve usar classes de estrutura:

- `system-silo-nav-wrapper`
- `system-silo-nav-grid`
- `system-silo-nav-start`
- `system-silo-nav-center`
- `system-silo-nav-item`
- `system-silo-nav-end-top`
- `system-silo-nav-end-bottom`

Essas classes definem disposicao, nao identidade visual.

As cores e fontes devem vir da marca.

## Regras de densidade

Para admin:

- Evitar `p-6`, `gap-6`, `space-y-6` como padrao.
- Usar componentes compactos para KPIs.
- Tabelas devem ter linhas densas.
- Paineis raros devem ser recolhiveis.
- Botoes devem ter altura consistente.

Para frontend:

- Manter conforto visual da marca.
- Nao aplicar compactacao administrativa.

## Onde esta hoje

`app/globals.css` hoje concentra:

- Tema publico Mini WordPress.
- Sistema admin.
- Classes do editor.
- Classes do template de menu.

Para produto neutro, o ideal e separar em:

- `styles/miniwordpress/admin.css`
- `styles/miniwordpress/editor.css`
- `styles/miniwordpress/frontend-template.css`
- `styles/brands/Mini WordPress.css`

## Checklist antes de exportar

- Nenhum componente admin depende de `--brand-*`.
- Nenhum componente publico depende de `--admin-*`.
- `.editor-public-preview` esta excluido dos overrides administrativos.
- Classes `system-*` nao carregam cor fixa da Mini WordPress.
- Cores Tailwind claras nao aparecem em paineis administrativos sem motivo.
- Fontes de marca nao aparecem em paineis do Mini WordPress.
