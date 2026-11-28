#!/usr/bin/env bash
#
# Ado-Baileys — instalación y prueba en un solo comando.
#
# Uso:
#   bash <(curl -fsSL https://raw.githubusercontent.com/SergioOficial/ado-baileys/main/instalar.sh)
#
# Mantiene por defecto la instalación existente en ~/ado-baileys.
# No borra auth_test/, node_modules/ ni archivos locales.
#
set -eu

REPO="https://github.com/SergioOficial/ado-baileys.git"
NOMBRE="Ado-Baileys"
DIR="${ADO_BAILEYS_DIR:-$HOME/ado-baileys}"
RAMA="${ADO_BAILEYS_BRANCH:-main}"
MIN_NODE=20
SOLO_ACTUALIZAR=0

ayuda() {
  cat <<'FIN'
Ado-Baileys — instalar o actualizar sin cambiar la ruta.

  bash <(curl -fsSL https://raw.githubusercontent.com/SergioOficial/ado-baileys/main/instalar.sh)

Opciones:
  --dir RUTA       carpeta de instalación (por defecto ~/ado-baileys)
  --rama RAMA      rama de Git (por defecto main)
  --actualizar     actualizar la instalación existente
  --sin-color      desactivar colores
  -h, --ayuda      mostrar esta ayuda

Después:
  adobaileys test  iniciar la prueba interactiva de botones
  adobaileys dir   mostrar la ruta de instalación
  adobaileys update actualizar el repositorio y dependencias
FIN
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dir) shift; DIR="${1:?Falta la ruta después de --dir}" ;;
    --rama|--branch) shift; RAMA="${1:?Falta la rama después de --rama}" ;;
    --actualizar|--update) SOLO_ACTUALIZAR=1 ;;
    --sin-color|--no-color) ADO_BAILEYS_SIN_COLOR=1 ;;
    -h|--ayuda|--help) ayuda; exit 0 ;;
    *) printf 'Opción desconocida: %s (usa --ayuda)\n' "$1" >&2; exit 2 ;;
  esac
  shift
done

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ] && [ -z "${ADO_BAILEYS_SIN_COLOR:-}" ] && [ "${TERM:-}" != dumb ]; then
  C="$(printf '\033[1;35m')"; G="$(printf '\033[32m')"; Y="$(printf '\033[33m')"; R="$(printf '\033[0m')"
else
  C=""; G=""; Y=""; R=""
fi
paso() { printf '\n%s▸ %s%s\n' "$C" "$*" "$R"; }
bien() { printf '  %s✓%s %s\n' "$G" "$R" "$*"; }
aviso() { printf '  %s!%s %s\n' "$Y" "$R" "$*" >&2; }
fallar() { printf '\n%s✗ %s%s\n' "$Y" "$*" "$R" >&2; exit 1; }
hay() { command -v "$1" >/dev/null 2>&1; }

paso "$NOMBRE"
hay git || fallar "Falta Git. Instálalo con: pkg install git (Termux) o sudo apt install git (Debian/Ubuntu)."
hay node || fallar "Falta Node.js 20 o superior: https://nodejs.org"
hay npm || fallar "Falta npm."
VERSION="$(node -p 'process.versions.node')"
MAYOR="${VERSION%%.*}"
[ "$MAYOR" -ge "$MIN_NODE" ] || fallar "Node $VERSION no es compatible. Hace falta Node $MIN_NODE o superior."
bien "Git, Node $VERSION y npm disponibles"

if [ -d "$DIR/.git" ]; then
  paso "Conservando y actualizando $DIR"
  git -C "$DIR" fetch --quiet origin "$RAMA" || fallar "No se pudo conectar con GitHub."
  ANTES="$(git -C "$DIR" rev-parse --short HEAD)"
  if git -C "$DIR" pull --ff-only --quiet origin "$RAMA"; then
    DESPUES="$(git -C "$DIR" rev-parse --short HEAD)"
    [ "$ANTES" = "$DESPUES" ] && bien "Ya estaba al día ($DESPUES)" || bien "Actualizado: $ANTES → $DESPUES"
  else
    aviso "Hay cambios locales o divergencias; no los sobrescribo. Continúo con el código local."
  fi
elif [ -e "$DIR" ]; then
  fallar "$DIR existe pero no es un repositorio Git. No lo modificaré; usa --dir para otra ruta."
else
  paso "Clonando en $DIR"
  git clone --quiet --depth 1 --branch "$RAMA" "$REPO" "$DIR" || fallar "No se pudo clonar Ado-Baileys."
  bien "Repositorio descargado"
fi

cd "$DIR"
paso "Instalando dependencias"
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund --loglevel=error || npm install --no-audit --no-fund --loglevel=error || fallar "Falló la instalación de dependencias."
else
  npm install --no-audit --no-fund --loglevel=error || fallar "Falló npm install."
fi
bien "Dependencias listas"

paso "Comprobando la biblioteca"
node -e "const ado=require('./'); if(typeof ado.sendInteractiveButtons!=='function') process.exit(1); console.log('Ado-Baileys '+require('./package.json').version+' · botones disponibles')" || fallar "La biblioteca no carga correctamente."
node --check test/test-botones.js || fallar "El archivo de prueba de botones tiene un error de sintaxis."
bien "Biblioteca y prueba de botones verificadas"

paso "Preparando el comando adobaileys"
case "$DIR" in *"'"*|*'\\'*|*'$'*) aviso "La ruta contiene caracteres especiales; omito el lanzador global."; L_DIR="" ;; *) L_DIR="${PREFIX:+$PREFIX/bin}"; [ -n "$L_DIR" ] && [ -d "$L_DIR" ] || L_DIR="$HOME/.local/bin" ;; esac
if [ -n "$L_DIR" ] && { mkdir -p "$L_DIR" 2>/dev/null || true; } && [ -w "$L_DIR" ]; then
  cat > "$L_DIR/adobaileys" <<'LANZADOR'
#!/usr/bin/env bash
set -eu
ADO_BAILEYS_DIR='__ADO_DIR__'
case "${1:-test}" in
  test|botones|start)
    cd "$ADO_BAILEYS_DIR"
    exec npm run --silent test:botones ;;
  update|actualizar)
    exec bash "$ADO_BAILEYS_DIR/instalar.sh" --actualizar ;;
  dir|carpeta)
    printf '%s\n' "$ADO_BAILEYS_DIR" ;;
  version|-v|--version)
    node -p "require('$ADO_BAILEYS_DIR/package.json').version" ;;
  help|-h|--help)
    printf 'adobaileys test   iniciar la prueba interactiva de botones\nadobaileys update  actualizar la biblioteca\nadobaileys dir     mostrar la ruta\n' ;;
  *)
    printf 'Uso: adobaileys [test|update|dir|version|help]\n' >&2
    exit 2 ;;
esac
LANZADOR
  # Sustituir el marcador por la ruta elegida.
  sed "s|__ADO_DIR__|$DIR|g" "$L_DIR/adobaileys" > "$L_DIR/adobaileys.tmp"
  mv "$L_DIR/adobaileys.tmp" "$L_DIR/adobaileys"
  chmod 755 "$L_DIR/adobaileys"
  bien "Comando adobaileys instalado en $L_DIR"
else
  aviso "No pude instalar el comando global; puedes usar: cd '$DIR' && npm run test:botones"
fi

printf '\n%s%s listo.%s\n' "$C" "$NOMBRE" "$R"
printf '  Ruta: %s\n' "$DIR"
printf '  Prueba: adobaileys test\n'
printf '  O manualmente: cd "%s" && npm run test:botones\n' "$DIR"
printf '\n  La prueba abre WhatsApp y muestra un QR si no existe auth_test/.\n'
printf '  No se inicia automáticamente y no se borra ninguna sesión.\n\n'
