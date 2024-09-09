workspace(
    name = "spica",
    managed_directories = {"@npm": ["node_modules"]},
)

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
load("@bazel_tools//tools/build_defs/repo:git.bzl", "git_repository")

# Setup nodejs workspace
http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "a1295b168f183218bc88117cf00674bcd102498f294086ff58318f830dd9d9d1",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/5.8.5/rules_nodejs-5.8.5.tar.gz"],
)

http_archive(
    name = "rules_nodejs",
    sha256 = "0c2277164b1752bb71ecfba3107f01c6a8fb02e4835a790914c71dfadcf646ba",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/5.8.5/rules_nodejs-core-5.8.5.tar.gz"],
)

http_archive(
    name = "bazel_skylib",
    sha256 = "bc283cdfcd526a52c3201279cda4bc298652efa898b10b4db0837dc51652756f",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/bazel-skylib/releases/download/1.7.1/bazel-skylib-1.7.1.tar.gz",
        "https://github.com/bazelbuild/bazel-skylib/releases/download/1.7.1/bazel-skylib-1.7.1.tar.gz",
    ],
)

load("@bazel_skylib//:workspace.bzl", "bazel_skylib_workspace")

bazel_skylib_workspace()

load("@build_bazel_rules_nodejs//:index.bzl", "node_repositories", "yarn_install")

node_repositories(
    node_version = "16.20.2",
)

yarn_install(
    name = "npm",
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)

yarn_install(
    name = "npm_cli",
    package_json = "//stacks/cli:package.json",
    yarn_lock = "//stacks/cli:yarn.lock",
)

# Setup docker workspace
http_archive(
    name = "io_bazel_rules_docker",
    sha256 = "b1e80761a8a8243d03ebca8845e9cc1ba6c82ce7c5179ce2b295cd36f7e394bf",
    urls = ["https://github.com/bazelbuild/rules_docker/releases/download/v0.25.0/rules_docker-v0.25.0.tar.gz"],
)

load(
    "@io_bazel_rules_docker//repositories:repositories.bzl",
    container_repositories = "repositories",
)

container_repositories()

load("@io_bazel_rules_docker//repositories:deps.bzl", container_deps = "deps")

container_deps()

# Download base images, etc
load("@io_bazel_rules_docker//container:container.bzl", "container_pull")

container_pull(
    name = "nginx_image",
    digest = "sha256:558b1480dc5c8f4373601a641c56b4fd24a77105d1246bd80b991f8b5c5dc0fc",
    registry = "index.docker.io",
    repository = "library/nginx",
    tag = "alpine",
)

container_pull(
    name = "debian_image",
    digest = "sha256:1278dfac90d6110555b5ee795832f794fb2fa36cd73cd4844c69405193d54806",
    registry = "index.docker.io",
    repository = "library/debian",
    tag = "buster-slim",
)

load(
    "@io_bazel_rules_docker//nodejs:image.bzl",
    nodejs_image_repos = "repositories",
)

nodejs_image_repos()

# Prepare base image for mongoreplicationcontroller
load("@io_bazel_rules_docker//contrib:dockerfile_build.bzl", "dockerfile_image")

dockerfile_image(
    name = "mongoreplicationcontroller_base",
    dockerfile = "//tools/mongoreplicationcontroller:Dockerfile",
)

# Setup kubernetes workspace
git_repository(
    name = "io_bazel_rules_k8s",
    commit = "26b1b471b4c2af39c4e2fedb2b25a3940b531a99",
    remote = "https://github.com/bazelbuild/rules_k8s.git",
    shallow_since = "1581367747 -0500",
)

load("@io_bazel_rules_k8s//k8s:k8s.bzl", "k8s_defaults", "k8s_repositories")

k8s_repositories()

# Create a rule named as k8s_deploy

k8s_defaults(
    name = "k8s_deploy",
    cluster = "_".join([
        "gke",
        "spica-239113",
        "us-central1-a",
        "godfather",  # Change to "ssl-cluster", to deploy prod.
    ]),
    image_chroot = "index.docker.io",
    kind = "deployment",
)
