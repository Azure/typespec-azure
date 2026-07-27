FROM mcr.microsoft.com/devcontainers/javascript-node:26

# Install mise for toolchain management (node, pnpm, python, go, java, etc.)
RUN curl https://mise.run | MISE_INSTALL_PATH=/usr/local/bin/mise sh \
  && echo 'eval "$(/usr/local/bin/mise activate bash)"' >> /home/node/.bashrc \
  && echo 'eval "$(/usr/local/bin/mise activate zsh)"' >> /home/node/.zshrc

RUN git config --global submodule.recurse true
