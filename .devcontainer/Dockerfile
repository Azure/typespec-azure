FROM mcr.microsoft.com/devcontainers/javascript-node:26

# Install mise for toolchain management (node, pnpm, python, go, java, etc.)
RUN curl https://mise.run | MISE_INSTALL_PATH=/usr/local/bin/mise sh \
  && echo 'eval "$(/usr/local/bin/mise activate bash)"' >> /home/node/.bashrc \
  && echo 'eval "$(/usr/local/bin/mise activate zsh)"' >> /home/node/.zshrc

# Pre-install all toolchain versions pinned in mise.toml/mise.lock into the image
COPY mise.toml mise.lock /tmp/mise-setup/
RUN chown -R node:node /tmp/mise-setup
USER node
RUN cd /tmp/mise-setup && mise trust && mise install
USER root

RUN git config --global submodule.recurse true
