pipeline {
agent any

environment {
    DOCKER_REGISTRY = 'rohitxten'

    FRONTEND_IMAGE = "${DOCKER_REGISTRY}/routeguardg-frontend:${BUILD_NUMBER}"
    BACKEND_IMAGE  = "${DOCKER_REGISTRY}/routeguardg-backend:${BUILD_NUMBER}"
    ML_IMAGE       = "${DOCKER_REGISTRY}/routeguardg-ml:${BUILD_NUMBER}"

    FRONTEND_LATEST = "${DOCKER_REGISTRY}/routeguardg-frontend:latest"
    BACKEND_LATEST  = "${DOCKER_REGISTRY}/routeguardg-backend:latest"
    ML_LATEST       = "${DOCKER_REGISTRY}/routeguardg-ml:latest"

    K8S_NAMESPACE = 'routeguardg-ns'
}

stages {

    stage('Clone Repository') {
        steps {
            git branch: 'main',
            url: 'https://github.com/Rohit03022006/RouteGuard/'
        }
    }

    stage('Trivy File System Scan') {
        steps {
            sh '''
            trivy fs --severity HIGH,CRITICAL \
            --format table \
            -o trivy-fs-report.html .
            '''
        }
    }

    stage('Build Docker Images') {
        steps {
            sh '''
            docker build -t ${FRONTEND_IMAGE} ./frontend
            docker tag ${FRONTEND_IMAGE} ${FRONTEND_LATEST}

            docker build -t ${BACKEND_IMAGE} ./backend
            docker tag ${BACKEND_IMAGE} ${BACKEND_LATEST}

            docker build -t ${ML_IMAGE} ./SupplyChainMapping
            docker tag ${ML_IMAGE} ${ML_LATEST}
            '''
        }
    }

    stage('Push Docker Images') {
        steps {
            withCredentials([
                usernamePassword(
                    credentialsId: 'DockerHubCredential',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )
            ]) {
                sh '''
                echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

                docker push ${FRONTEND_IMAGE}
                docker push ${FRONTEND_LATEST}

                docker push ${BACKEND_IMAGE}
                docker push ${BACKEND_LATEST}

                docker push ${ML_IMAGE}
                docker push ${ML_LATEST}

                docker logout
                '''
            }
        }
    }

    stage('Trivy Image Scan') {
        steps {
            sh '''
            trivy image --severity HIGH,CRITICAL ${FRONTEND_IMAGE} || true
            trivy image --severity HIGH,CRITICAL ${BACKEND_IMAGE} || true
            trivy image --severity HIGH,CRITICAL ${ML_IMAGE} || true
            '''
        }
    }

    stage('Deploy to Kubernetes') {
        steps {
            withCredentials([file(credentialsId: 'kubeconfig', variable: 'KCFG')]) {
                sh '''
                export KUBECONFIG=$KCFG

                echo "Deploying RouteGuardg..."

                kubectl create namespace ${K8S_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

                kubectl apply -f K8S/

                kubectl set image deployment/frontend-deployment frontend=${FRONTEND_IMAGE} -n ${K8S_NAMESPACE}
                kubectl set image deployment/backend-deployment backend=${BACKEND_IMAGE} -n ${K8S_NAMESPACE}
                kubectl set image deployment/ml-deployment ml=${ML_IMAGE} -n ${K8S_NAMESPACE}

                kubectl rollout status deployment/frontend-deployment -n ${K8S_NAMESPACE}
                kubectl rollout status deployment/backend-deployment -n ${K8S_NAMESPACE}
                kubectl rollout status deployment/ml-deployment -n ${K8S_NAMESPACE}
                '''
            }
        }
    }
    stage('Deploy to Monitoring') {
        steps {
            script {
                sh '''
                echo "Deploying Monitoring Stack..."

                kubectl apply -f K8S/monitoring/

                echo "Monitoring stack deployed successfully!"
                '''
            }
        }
    }

    stage('Verify Deployment') {
        steps {
            sh '''
            kubectl get pods -n ${K8S_NAMESPACE}
            kubectl get svc -n ${K8S_NAMESPACE}
            kubectl get hpa -n ${K8S_NAMESPACE}
            '''
        }
    }
}

post {
    success {
        echo 'RouteGuardg deployed successfully!'
    }

    failure {
        echo 'Deployment failed!'
    }

    always {
        archiveArtifacts artifacts: '**/*report.html', allowEmptyArchive: true
    }
}

}
