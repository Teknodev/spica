workspace(
    name = "spica",
    managed_directories = {"@npm": ["node_modules"]},
)

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
load("@bazel_tools//tools/build_defs/repo:git.bzl", "git_repository")

# Setup nodejs workspace
http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "ad3e5afa52ef9aac4da426f61e339c054ecbc0e6665cec2109f8846b4c8339e3",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/4.6.3/rules_nodejs-4.6.3.tar.gz"],
)

load("@build_bazel_rules_nodejs//:index.bzl", "node_repositories", "yarn_install")

node_repositories(
    node_version = "16.11.1",
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
    sha256 = "59536e6ae64359b716ba9c46c39183403b01eabfbd57578e84398b4829ca499a",
    strip_prefix = "rules_docker-0.22.0",
    urls = ["https://github.com/bazelbuild/rules_docker/releases/download/v0.22.0/rules_docker-v0.22.0.tar.gz"],
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
    digest = "sha256:50c6072140eb89a1cd28f8b2660addbdf0dff862ea93e46c5ebafa309d809cc0",
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
