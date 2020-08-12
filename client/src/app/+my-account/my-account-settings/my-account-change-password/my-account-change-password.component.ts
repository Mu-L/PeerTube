import { filter } from 'rxjs/operators'
import { Component, OnInit } from '@angular/core'
import { AuthService, Notifier, UserService } from '@app/core'
import { FormReactive, FormValidatorService, UserValidatorsService } from '@app/shared/shared-forms'
import { User } from '@shared/models'

@Component({
  selector: 'my-account-change-password',
  templateUrl: './my-account-change-password.component.html',
  styleUrls: [ './my-account-change-password.component.scss' ]
})
export class MyAccountChangePasswordComponent extends FormReactive implements OnInit {
  error: string = null
  user: User = null

  constructor (
    protected formValidatorService: FormValidatorService,
    private userValidatorsService: UserValidatorsService,
    private notifier: Notifier,
    private authService: AuthService,
    private userService: UserService
    ) {
    super()
  }

  ngOnInit () {
    this.buildForm({
      'current-password': this.userValidatorsService.USER_PASSWORD,
      'new-password': this.userValidatorsService.USER_PASSWORD,
      'new-confirmed-password': this.userValidatorsService.USER_CONFIRM_PASSWORD
    })

    this.user = this.authService.getUser()

    const confirmPasswordControl = this.form.get('new-confirmed-password')

    confirmPasswordControl.valueChanges
                          .pipe(filter(v => v !== this.form.value[ 'new-password' ]))
                          .subscribe(() => confirmPasswordControl.setErrors({ matchPassword: true }))
  }

  changePassword () {
    const currentPassword = this.form.value[ 'current-password' ]
    const newPassword = this.form.value[ 'new-password' ]

    this.userService.changePassword(currentPassword, newPassword).subscribe(
      () => {
        this.notifier.success($localize`Password updated.`)

        this.form.reset()
        this.error = null
      },

      err => {
        if (err.status === 401) {
          this.error = $localize`You current password is invalid.`
          return
        }

        this.error = err.message
      }
    )
  }
}
