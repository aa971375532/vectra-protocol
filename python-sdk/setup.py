from setuptools import setup, find_packages
import os

readme_path = os.path.join(os.path.dirname(__file__), "README.md")
long_description = ""
if os.path.exists(readme_path):
    with open(readme_path, "r", encoding="utf-8") as fh:
        long_description = fh.read()

setup(
    name="vectra-pay",
    version="1.0.0",
    description="Official Python SDK & HTTP 402 Middleware for Vectra ($VCTR) Decentralized AI Payments",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="Vectra Protocol Foundation",
    author_email="dev@vectra.network",
    url="https://aa971375532.github.io/vectra-protocol/",
    project_urls={
        "Source": "https://github.com/aa971375532/vectra-protocol",
        "Tracker": "https://github.com/aa971375532/vectra-protocol/issues",
    },
    packages=find_packages(),
    install_requires=[],
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    python_requires=">=3.8",
)
