# Imagem da home

## Fundo vigente desde 05/10/2026

O vídeo fornecido pelo responsável, `public/Video-Pacotes-Claro-Celular.mp4`, tem oito segundos, 1280 × 720, 24 fps e 4.870.817 bytes. O original está preservado. A versão usada pela hero é `public/videos/claro-pacotes-hero.mp4`, transcodificada para H.264 em 960 × 540, mantendo 24 fps e os oito segundos, com 1.104.203 bytes (77,33% menor). A faixa AAC de áudio foi removida do arquivo. A reprodução é automática em loop, com cover, degradê inferior e sem controles.

Conversão com FFmpeg portátil (sem instalação no sistema): `ffmpeg -i public/Video-Pacotes-Claro-Celular.mp4 -map 0:v:0 -an -sn -dn -map_metadata -1 -vf "fps=24,scale=960:540:flags=lanczos" -c:v libx264 -preset slow -crf 30 -threads 4 -g 48 -pix_fmt yuv420p -movflags +faststart public/videos/claro-pacotes-hero.mp4`. O ffprobe confirmou apenas uma faixa de vídeo, sem áudio. Uma comparação com WebM/VP9 em CRF 40 produziu 1.822.181 bytes; escolhemos o MP4 por ser menor neste material.

Verificação da duração completa: o original e a versão leve têm 8,000 segundos e 192 quadros, confirmados com `ffprobe -count_frames`. A conversão não usa corte de início ou fim. O teste de navegador acompanha a reprodução real do primeiro ciclo sem avançar o vídeo, observa mais de 7,5 segundos reproduzidos e confirma que o loop reinicia apenas ao terminar o arquivo.

O poster `public/images/hero-claro-poster.webp` foi extraído de um quadro do vídeo em aproximadamente um segundo, em 1280 × 720, com 76.886 bytes. Serve como fundo inicial enquanto o MP4 aguarda três segundos após o carregamento da página. O vídeo é decorativo e o texto comercial e os botões ficam em HTML acessível sobre o fundo.

O vídeo e o poster cobrem um único fundo contínuo desde o topo do cabeçalho da home até o final da hero, incluindo logo e navegação. O menu móvel pode expandir essa área sem duplicar a mídia. A duração e o arquivo otimizado permanecem os mesmos.

## Ilustração anterior preservada

O arquivo abaixo foi usado na versão anterior da hero e permanece disponível no projeto. Foi substituído como fundo pela solicitação do responsável.

Imagem gerada pelo recurso de criação de imagens do Codex para ilustrar usos da internet em família. Não é um depoimento nem a representação de clientes identificados.

Arquivo original desta sessão: `C:/Users/scalb/.codex/generated_images/01a10825-07e0-7f23-8429-465be5586d46/exec-29ebd5a6-b262-486c-aa9f-95c10ff16219.png`.

Arquivo do site: `public/images/familia-conectada.webp`, convertido com Sharp para 1200 × 900 e qualidade 85. Alt: família usando dispositivos em uma sala de estar. O site não apresenta texto comercial dentro da imagem.

Prompt enviado:

```text
Use case: photorealistic-natural. Asset type: landscape lifestyle hero photograph for Brazilian consumer internet marketplace WifiConecta, web asset, no text. Primary request: candid happy Brazilian multiracial family at home using connected devices, a mother with medium brown skin and dark curly hair seated on pale neutral sofa working casually with an open laptop on her lap, father with warm tan skin and short dark hair beside her smiling at their young daughter seated between them holding a tablet. Comfortable realistic contemporary Brazilian middle-class living room, soft linen beige sofa, navy and muted teal cushions, a houseplant and pale wall, warm daylight from window, organic natural expressions, casual everyday clothes in neutral and denim colors. Composition/framing: landscape 4:3, medium-wide editorial photo, family centered toward right half, clear faces, bodies and devices fully plausible, crop-safe with comfortable space above heads and below hands. Natural photographic texture, subtle film quality, refined warm lighting with soft teal and cream accents, believable home rather than luxury showroom. Constraints: no graphics, no logos, no visible readable screens, no typography, no watermark, no signal arcs, no futuristic interface, no staged exaggerated smiles. Generate as a usable website photograph.
```
