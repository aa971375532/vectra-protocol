from setuptools import setup, find_packages

setup(
    name="vectra-pay",
    version="1.0.0",
    description="Official Python SDK & HTTP 402 Middleware for Vectra ($VCTR) Decentralized AI Payments",
    author="Vectra Protocol Foundation",
    packages=find_packages(),
    install_requires=[],
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    python_requires=">=3.8",
)
